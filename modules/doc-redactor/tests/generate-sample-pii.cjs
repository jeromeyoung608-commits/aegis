// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Generates a one-page A4 PDF containing fictional German PII.
 * Dev-only helper: requires pdf-lib (declared in package.json devDependencies).
 *
 * Usage: node generate-sample-pii.cjs [outputPath]
 *
 * (2026-11-16) The output is byte-for-byte reproducible. pdf-lib stamps
 * CreationDate/ModDate with the current time, which made every regeneration
 * rewrite the tracked fixture and leave the working tree dirty after a test
 * run. The dates are pinned below, so the file only changes when this script
 * changes.
 */
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// Fixed timestamp: any change here changes the fixture bytes.
const FIXED_DATE = new Date('2026-01-01T00:00:00Z');

(async () => {
  const outDir = path.join(__dirname, 'artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = process.argv[2] || path.join(outDir, 'sample-pii.pdf');

  const doc = await PDFDocument.create();
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);
  doc.setProducer('aegis-doc-redactor test fixture');
  doc.setCreator('aegis-doc-redactor test fixture');
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 790;
  const line = (text, size = 16, face = font, gap = 30) => {
    page.drawText(text, { x: 60, y, size, font: face, color: rgb(0, 0, 0) });
    y -= gap;
  };

  line('CONFIDENTIAL CLIENT INTAKE FORM', 19, bold, 42);
  line('Law firm sample document - fictional data only', 11, font, 46);
  line('Client name: Klaus Mueller', 16);
  line('Date of birth: 14.03.1972', 16);
  line('Street address: Musterstrasse 12, 10115 Berlin', 16);
  line('Email: klaus.mueller@kanzlei-beispiel.de', 16);
  line('Phone: +49 30 12345678', 16);
  line('IBAN: DE89 3704 0044 0532 0130 00', 16);
  line('VAT ID: DE123456789', 16);
  line('Invoice total: 12.450,00 EUR', 16);
  line('Payment due date: 01.10.2026', 16);
  line('Case reference: 2024/0815', 16);
  line('Insurance number: 123456789', 16, font, 46);
  line('The client hereby authorises the firm to process', 13, font, 24);
  line('the above personal data for the stated mandate.', 13, font, 24);

  fs.writeFileSync(outPath, await doc.save());
  console.log('SAMPLE_WRITTEN', outPath, fs.statSync(outPath).size);
})();
