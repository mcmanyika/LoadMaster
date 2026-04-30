import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { sendChatMessage } from './openaiService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const PDF_TEXT_LIMIT = 18000;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export interface ExtractedField<T> {
  value: T | null;
  confidence: number;
  source: string;
}

export interface ExtractedLoadData {
  company: ExtractedField<string>;
  gross: ExtractedField<number>;
  miles: ExtractedField<number>;
  dropDate: ExtractedField<string>;
  origin: ExtractedField<string>;
  destination: ExtractedField<string>;
}

const EMPTY_FIELD = {
  value: null,
  confidence: 0,
  source: ''
};

const emptyExtraction = (): ExtractedLoadData => ({
  company: { ...EMPTY_FIELD },
  gross: { ...EMPTY_FIELD },
  miles: { ...EMPTY_FIELD },
  dropDate: { ...EMPTY_FIELD },
  origin: { ...EMPTY_FIELD },
  destination: { ...EMPTY_FIELD }
});

const stripCodeFences = (content: string): string =>
  content.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

const clampConfidence = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

/**
 * PDF text often concatenates table column headers (e.g. "Name Pickup From Pickup To")
 * before the actual shipper/facility name. Collapse to just the company name.
 */
export const sanitizePickupCompanyName = (raw: string | null | undefined): string | null => {
  if (raw == null || typeof raw !== 'string') return null;
  let s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return null;

  // Remove noisy PDF table/header fragments that can be glued to the facility name.
  s = s
    .replace(/information\s+name\s+pickup\s+from\s+pickup\s*,?\s*to/gi, ' ')
    .replace(/name\s+pickup\s+from\s+pickup\s*,?\s*to/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stripPrefixes = [
    /^name\s+pickup\s+from\s+pickup\s+to\s+/i,
    /^pickup\s+from\s+pickup\s+to\s+/i,
    /^pickup\s+from\s+to\s+/i,
    /^pickup\s+from\s+/i,
    /^pickup\s+to\s+/i,
    /^name\s+/i,
    /^pickup\s+information\s*[:]?\s*/i,
    /^shipper\s*[:]?\s*/i,
    /^pickup\s+name\s*[:]?\s*/i,
    /^pickup\s+facility\s*[:]?\s*/i,
    /^facility\s*[:]?\s*/i,
    /^location\s*[:]?\s*/i,
    /^stop\s*#?\s*1\s*[:]?\s*/i
  ];

  for (let g = 0; g < 10; g++) {
    let changed = false;
    for (const re of stripPrefixes) {
      const n = s.replace(re, '').trim();
      if (n !== s) {
        s = n;
        changed = true;
      }
    }
    if (!changed) break;
  }

  s = s.replace(/\bname\s+pickup\s+from\s+pickup\s+to\b/gi, ' ').replace(/\s+/g, ' ').trim();

  const afterPickupTo = s.match(/\bpickup\s+from\s+pickup\s+to\s+(.+)$/i);
  if (afterPickupTo?.[1]?.trim()) {
    s = afterPickupTo[1].trim();
  }

  const afterLastTo = s.match(/\bto\s+((?:[A-Z][^\s]*)(?:\s+[A-Z0-9][^\s]*)*)\s*$/i);
  if (afterLastTo?.[1]?.trim() && afterLastTo[1].trim().length >= 3) {
    s = afterLastTo[1].trim();
  }

  const tailMatch = s.match(
    /((?:[A-Z]{2,}|[A-Z][a-z]+)(?:\s+(?:[A-Z]{2,}|[A-Z][a-z]+|\d+))*)\s*$/
  );
  if (tailMatch) {
    const tail = tailMatch[1].trim();
    const head = s.slice(0, s.length - tailMatch[0].length).trim();
    if (
      tail.length >= 3 &&
      (!head ||
        /^(name|pickup|from|to|shipper|facility|location|information|and|the|at|#|\d+|\s|[-–])+$/i.test(head))
    ) {
      s = tail;
    }
  }

  s = s.replace(/\s+/g, ' ').trim();
  return s.length ? s : null;
};

const toIsoDate = (input: string): string | null => {
  const trimmed = input.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;

  const usMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!usMatch) return null;

  const mm = usMatch[1].padStart(2, '0');
  const dd = usMatch[2].padStart(2, '0');
  const yyyy = usMatch[3].length === 2 ? `20${usMatch[3]}` : usMatch[3];
  return `${yyyy}-${mm}-${dd}`;
};

const extractByRegexFallback = (text: string): ExtractedLoadData => {
  const result = emptyExtraction();

  const grossMatch = text.match(/(?:rate|linehaul|gross|total)\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (grossMatch?.[1]) {
    result.gross = {
      value: Number(grossMatch[1].replace(/,/g, '')),
      confidence: 0.62,
      source: grossMatch[0]
    };
  }

  const milesMatch = text.match(/(?:total\s*)?miles?\s*[:\-]?\s*([\d,]+(?:\.\d+)?)/i);
  if (milesMatch?.[1]) {
    result.miles = {
      value: Number(milesMatch[1].replace(/,/g, '')),
      confidence: 0.6,
      source: milesMatch[0]
    };
  }

  const dateMatch = text.match(/(?:delivery|drop|pickup)\s*date\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  const isoDate = dateMatch?.[1] ? toIsoDate(dateMatch[1]) : null;
  if (isoDate) {
    result.dropDate = {
      value: isoDate,
      confidence: 0.58,
      source: dateMatch?.[0] || ''
    };
  }

  const formatCityState = (cityPart: string, st: string): string => {
    const city = cityPart.replace(/\s+/g, ' ').trim();
    const state = st.replace(/\./g, '').toUpperCase().slice(0, 2);
    return `${city}, ${state}`;
  };

  const originPatterns: RegExp[] = [
    /(?:origin|pickup\s*location|pickup\s*address|ship\s*from|pickup(?!\s*date))\s*[:\-]?\s*([A-Za-z0-9 .#\-']+?),\s*([A-Za-z]{2})(?:\s+\d{5})?\b/i,
    /(?:origin|pickup\s*location|pickup\s*address|ship\s*from|pickup(?!\s*date))\s*[:\-]?\s*([A-Za-z0-9 .#\-']+?)\s+([A-Z]{2})(?:\s+\d{5})?\b/i
  ];
  for (const re of originPatterns) {
    const originMatch = text.match(re);
    if (originMatch?.[1] && originMatch[2]) {
      const cityPart = originMatch[1].trim();
      if (cityPart.split(/\s+/).length <= 8) {
        result.origin = {
          value: formatCityState(cityPart, originMatch[2]),
          confidence: 0.58,
          source: originMatch[0]
        };
        break;
      }
    }
  }

  const destPatterns: RegExp[] = [
    /(?:destination|delivery\s*location|consignee|drop(?:\s*off)?|deliver\s*to|delivery(?!\s*date))\s*[:\-]?\s*([A-Za-z0-9 .#\-']+?),\s*([A-Za-z]{2})(?:\s+\d{5})?\b/i,
    /(?:destination|delivery\s*location|consignee|drop(?:\s*off)?|deliver\s*to|delivery(?!\s*date))\s*[:\-]?\s*([A-Za-z0-9 .#\-']+?)\s+([A-Z]{2})(?:\s+\d{5})?\b/i
  ];
  for (const re of destPatterns) {
    const destinationMatch = text.match(re);
    if (destinationMatch?.[1] && destinationMatch[2]) {
      const cityPart = destinationMatch[1].trim();
      if (cityPart.split(/\s+/).length <= 8) {
        result.destination = {
          value: formatCityState(cityPart, destinationMatch[2]),
          confidence: 0.58,
          source: destinationMatch[0]
        };
        break;
      }
    }
  }

  // First field maps to Load.company but must be PICKUP information only (not broker/customer).
  const pickupInfoMatch =
    text.match(
      /(?:pickup\s*information|pickup\s*shipper|pickup\s*name|pickup\s*facility|shipper\s*at\s*pickup)\s*[:\-]?\s*([A-Za-z0-9 .,&#'\-]{3,120})/i
    ) ||
    text.match(/(?:^|[\n\r])\s*shipper\s*[:\-]\s*([A-Za-z0-9 .,&#'\-]{3,120})/im);
  if (pickupInfoMatch?.[1]) {
    const cleaned = sanitizePickupCompanyName(pickupInfoMatch[1].trim());
    result.company = {
      value: cleaned ?? pickupInfoMatch[1].trim(),
      confidence: 0.58,
      source: pickupInfoMatch[0]
    };
  }

  return result;
};

const readPdfText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({ data: uint8 });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pages.push(pageText);
  }

  return pages.join('\n').slice(0, PDF_TEXT_LIMIT);
};

const parseExtractionPayload = (payload: string): ExtractedLoadData => {
  const parsed = JSON.parse(stripCodeFences(payload));
  const empty = emptyExtraction();

  const mapField = <T>(raw: any): ExtractedField<T> => ({
    value: raw?.value ?? null,
    confidence: clampConfidence(raw?.confidence),
    source: typeof raw?.source === 'string' ? raw.source : ''
  });

  const companyMapped = mapField<string>(parsed.company ?? empty.company);
  const companyCleaned =
    typeof companyMapped.value === 'string'
      ? sanitizePickupCompanyName(companyMapped.value)
      : null;

  return {
    company: {
      ...companyMapped,
      value: companyCleaned
    },
    gross: mapField<number>(parsed.gross ?? empty.gross),
    miles: mapField<number>(parsed.miles ?? empty.miles),
    dropDate: mapField<string>(parsed.dropDate ?? empty.dropDate),
    origin: mapField<string>(parsed.origin ?? empty.origin),
    destination: mapField<string>(parsed.destination ?? empty.destination)
  };
};

export const extractLoadDataFromPdf = async (file: File): Promise<ExtractedLoadData> => {
  const text = await readPdfText(file);
  if (!text.trim()) {
    throw new Error('No readable text found in PDF.');
  }

  const systemPrompt = `
You extract trucking load data from rate confirmation text.
Return strict JSON only with this exact structure:
{
  "company": {"value": string|null, "confidence": number, "source": string},
  "gross": {"value": number|null, "confidence": number, "source": string},
  "miles": {"value": number|null, "confidence": number, "source": string},
  "dropDate": {"value": "YYYY-MM-DD"|null, "confidence": number, "source": string},
  "origin": {"value": string|null, "confidence": number, "source": string},
  "destination": {"value": string|null, "confidence": number, "source": string}
}
Rules:
- confidence must be 0 to 1
- prefer null over guessing
- gross is total linehaul/rate if present
- output date as YYYY-MM-DD when possible
- The "company" field is the pickup facility / shipper COMPANY NAME ONLY: a short proper name
  (e.g. "GAVCO PLASTICS 4"). Do NOT include column labels, headers, or words like Name, Pickup, From, To, Address.
  Not broker or bill-to. If only broker is visible, set company to null.
- origin and destination: US/CA city and state as "City, ST" (comma). Accept PDF text with or without a comma before the 2-letter state; normalize to "City, ST".
- no markdown, no explanation
`.trim();

  let attemptedDirectClientCall = false;

  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.functions.invoke('extract-load-from-pdf', {
        body: { text }
      });

      if (error) {
        throw new Error(error.message || 'Edge function invocation failed');
      }

      const content = data?.content;
      if (!content || typeof content !== 'string') {
        throw new Error('Edge function returned invalid response');
      }

      return parseExtractionPayload(content);
    }

    attemptedDirectClientCall = true;
    const directResponse = await sendChatMessage(
      [{ role: 'user', content: `Extract fields from this PDF text:\n\n${text}` }],
      systemPrompt
    );
    return parseExtractionPayload(directResponse);
  } catch (edgeOrAiError) {
    console.warn('AI extraction failed, trying direct client fallback.', edgeOrAiError);
    if (!attemptedDirectClientCall) {
      try {
        const directResponse = await sendChatMessage(
          [{ role: 'user', content: `Extract fields from this PDF text:\n\n${text}` }],
          systemPrompt
        );
        return parseExtractionPayload(directResponse);
      } catch (directError) {
        console.warn('Direct AI fallback failed, using regex extraction.', directError);
      }
    }

    const fallback = extractByRegexFallback(text);
    const hasAnyValue = Object.values(fallback).some(field => field.value !== null && field.value !== '');
    if (hasAnyValue) {
      return fallback;
    }
    throw new Error('Failed to fetch AI extraction and fallback parsing could not find fields.');
  }
};
