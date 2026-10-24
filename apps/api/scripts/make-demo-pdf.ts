import {
  DEMO_INVOICE_NO,
  DEMO_ITEM_1,
  DEMO_ITEM_2,
  DEMO_QTY_1,
  DEMO_QTY_2,
  DEMO_RATE_1,
  DEMO_RATE_2,
  DEMO_SUPPLIER,
  SPACE,
} from "shared";

const PDF_HEADER = "%PDF-1.4" as const;
const OBJ_OPEN = " 0 obj" as const;
const OBJ_CLOSE = "endobj" as const;
const STREAM_OPEN = "stream" as const;
const STREAM_CLOSE = "endstream" as const;
const XREF_HEAD = "xref" as const;
const XREF_COUNT_LINE = "0 6" as const;
const XREF_FREE_ENTRY = "0000000000 65535 f " as const;
const XREF_USED_SUFFIX = " 00000 n " as const;
const TRAILER_HEAD = "trailer" as const;
const TRAILER_BODY = "<< /Size 6 /Root 1 0 R >>" as const;
const STARTXREF = "startxref" as const;
const PDF_EOF = "%%EOF" as const;
const NEWLINE = "\n" as const;
const PAD_WIDTH = 10 as const;
const PAD_CHAR = "0" as const;

const CATALOG_OBJ = "<< /Type /Catalog /Pages 2 0 R >>" as const;
const PAGES_OBJ = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" as const;
const PAGE_OBJ =
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>" as const;
const FONT_OBJ = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" as const;
const LENGTH_PREFIX = "<< /Length " as const;
const LENGTH_SUFFIX = " >>" as const;

const TEXT_BEGIN = "BT /F1 12 Tf 72 720 Td" as const;
const TEXT_NEXT_LINE = "0 -20 Td" as const;
const TEXT_SHOW_PREFIX = "(" as const;
const TEXT_SHOW_SUFFIX = ") Tj" as const;
const TEXT_END = "ET" as const;

const INVOICE_LABEL = "INVOICE" as const;
const SUPPLIER_LABEL = "Supplier:" as const;
const ITEM_LABEL = "Item:" as const;
const QTY_LABEL = "Qty:" as const;
const RATE_LABEL = "Rate:" as const;

const OUTPUT_PATH = "tests/fixtures/demo-invoice.pdf" as const;
const FIRST_OBJECT_NUMBER = 1 as const;

const textLines: string[] = [
  [INVOICE_LABEL, DEMO_INVOICE_NO].join(SPACE),
  [SUPPLIER_LABEL, DEMO_SUPPLIER].join(SPACE),
  [ITEM_LABEL, DEMO_ITEM_1, QTY_LABEL, String(DEMO_QTY_1), RATE_LABEL, String(DEMO_RATE_1)].join(SPACE),
  [ITEM_LABEL, DEMO_ITEM_2, QTY_LABEL, String(DEMO_QTY_2), RATE_LABEL, String(DEMO_RATE_2)].join(SPACE),
];

const contentOps: string[] = [TEXT_BEGIN];
for (const line of textLines) {
  contentOps.push([TEXT_SHOW_PREFIX, line, TEXT_SHOW_SUFFIX].join(""));
  contentOps.push(TEXT_NEXT_LINE);
}
contentOps.push(TEXT_END);
const contentStream: string = contentOps.join(NEWLINE);

const objects: string[] = [
  CATALOG_OBJ,
  PAGES_OBJ,
  PAGE_OBJ,
  FONT_OBJ,
  [LENGTH_PREFIX, String(new TextEncoder().encode(contentStream).length), LENGTH_SUFFIX, NEWLINE, STREAM_OPEN, NEWLINE, contentStream, NEWLINE, STREAM_CLOSE].join(""),
];

let pdf: string = PDF_HEADER + NEWLINE;
const offsets: number[] = [];
const encoder = new TextEncoder();
for (const [index, objBody] of objects.entries()) {
  offsets.push(encoder.encode(pdf).length);
  pdf += String(index + FIRST_OBJECT_NUMBER) + OBJ_OPEN + NEWLINE + objBody + NEWLINE + OBJ_CLOSE + NEWLINE;
}

const xrefOffset: number = encoder.encode(pdf).length;
pdf += XREF_HEAD + NEWLINE + XREF_COUNT_LINE + NEWLINE + XREF_FREE_ENTRY + NEWLINE;
for (const offset of offsets) {
  pdf += String(offset).padStart(PAD_WIDTH, PAD_CHAR) + XREF_USED_SUFFIX + NEWLINE;
}
pdf += TRAILER_HEAD + NEWLINE + TRAILER_BODY + NEWLINE + STARTXREF + NEWLINE + String(xrefOffset) + NEWLINE + PDF_EOF + NEWLINE;

await Bun.write(OUTPUT_PATH, encoder.encode(pdf));
