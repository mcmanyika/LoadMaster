-- Allow superusers to view and update all user profiles (account activate/deactivate)

CREATE OR REPLACE FUNCTION is_superuser()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'superuser'
  );
$$;

DROP POLICY IF EXISTS "Superusers can view all profiles" ON profiles;
CREATE POLICY "Superusers can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_superuser());

DROP POLICY IF EXISTS "Superusers can update any profile" ON profiles;
CREATE POLICY "Superusers can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE OR REPLACE FUNCTION can_view_profile(profile_id UUID, profile_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id UUID;
  user_company_id UUID;
  is_owner BOOLEAN;
  profile_role TEXT;
  target_profile_role TEXT;
  has_active_dispatcher_association BOOLEAN;
  has_active_driver_association BOOLEAN;
  dispatch_company_owns_company BOOLEAN;
  dispatcher_associated_with_dispatch_company BOOLEAN;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF is_superuser() THEN
    RETURN TRUE;
  END IF;

  IF profile_id = current_user_id THEN
    RETURN TRUE;
  END IF;

  SELECT company_id, role INTO user_company_id, profile_role
  FROM profiles
  WHERE id = current_user_id;

  SELECT role INTO target_profile_role
  FROM profiles
  WHERE id = profile_id;

  IF user_company_id IS NOT NULL AND profile_company_id = user_company_id THEN
    RETURN TRUE;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM companies
    WHERE id = profile_company_id AND owner_id = current_user_id
  ) INTO is_owner;

  IF is_owner THEN
    RETURN TRUE;
  END IF;

  IF profile_role = 'owner' AND target_profile_role = 'dispatcher' THEN
    RETURN TRUE;
  END IF;

  IF profile_role = 'dispatcher' AND target_profile_role = 'driver' THEN
    SELECT EXISTS(
      SELECT 1
      FROM dispatcher_company_associations
      WHERE dispatcher_id = current_user_id
      AND company_id = profile_company_id
      AND status = 'active'
    ) INTO has_active_dispatcher_association;

    IF has_active_dispatcher_association THEN
      RETURN TRUE;
    END IF;
  END IF;

  IF profile_role = 'driver' AND target_profile_role = 'dispatcher' THEN
    SELECT EXISTS(
      SELECT 1
      FROM driver_company_associations
      WHERE driver_id = current_user_id
      AND company_id = profile_company_id
      AND status = 'active'
    ) INTO has_active_driver_association;

    IF has_active_driver_association THEN
      RETURN TRUE;
    END IF;
  END IF;

  IF profile_role = 'dispatch_company' AND target_profile_role = 'dispatcher' THEN
    SELECT EXISTS(
      SELECT 1 FROM companies
      WHERE owner_id = current_user_id
    ) INTO dispatch_company_owns_company;

    IF dispatch_company_owns_company THEN
      SELECT EXISTS(
        SELECT 1
        FROM dispatcher_company_associations dca
        JOIN companies c ON c.id = dca.company_id
        WHERE dca.dispatcher_id = profile_id
        AND c.owner_id = current_user_id
        AND dca.status = 'active'
      ) INTO dispatcher_associated_with_dispatch_company;

      IF dispatcher_associated_with_dispatch_company THEN
        RETURN TRUE;
      END IF;
    END IF;
  END IF;

  IF profile_role = 'dispatch_company' AND target_profile_role = 'driver' THEN
    SELECT EXISTS(
      SELECT 1
      FROM dispatcher_company_associations dca
      JOIN driver_company_associations drca ON drca.company_id = dca.company_id
      WHERE dca.dispatcher_id = current_user_id
      AND drca.driver_id = profile_id
      AND dca.status = 'active'
      AND drca.status = 'active'
    ) INTO dispatcher_associated_with_dispatch_company;

    IF dispatcher_associated_with_dispatch_company THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;
