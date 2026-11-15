# Third-Party Notices — vendored dependencies

The `doc-redactor` module bundles the following third-party libraries **locally** under this
`vendor/` directory so it can run with no npm install and no network access. They are real
dependencies; their licenses are reproduced/referenced below and **must accompany any
redistribution** (MIT §2 and Apache-2.0 §4 require the license text to be included).

> **Integrity:** `MANIFEST.json` in this directory records the exact upstream version, source
> URL, SHA-256 of every bundled file, and the SPDX license id. Verify a deployment with
> `sha256sum` against the manifest before shipping.

| Component | Version | License (SPDX) | Source |
|-----------|---------|----------------|--------|
| pdf.js | 3.11.174 | Apache-2.0 | https://github.com/mozilla/pdf.js |
| pdf-lib | 1.17.1 | MIT | https://github.com/Hopding/pdf-lib |
| tesseract.js | 5.1.1 | Apache-2.0 | https://github.com/naptha/tesseract.js |
| tesseract.js-core | 5.1.1 | Apache-2.0 | https://github.com/naptha/tesseract.js-core |
| tessdata (`deu`, `eng`) | 4.0.0 best_int | Apache-2.0 | https://github.com/tesseract-ocr/tessdata |

Exact copyright lines live in each library's own source header and should be preserved. Each
`vendor/<lib>/` directory now carries a `LICENSE` file holding the full upstream licence text
followed by that component's attribution line. The bundled minified builds had their upstream
copyright headers stripped by the upstream build step, so attribution lives in those `LICENSE`
files and in this notice.

---

## pdf-lib — MIT License

Copyright (c) 2019 Andrew Dillon (pdf-lib author and contributors)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software
and associated documentation files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## pdf.js / tesseract.js / tesseract.js-core / tessdata — Apache License 2.0

These components are licensed under the Apache License, Version 2.0. A complete copy of the
licence text ships with each component at `vendor/<component>/LICENSE`, followed by that
component's attribution line. The canonical text is also published at:

    http://www.apache.org/licenses/LICENSE-2.0

Obligations that apply to anyone redistributing these files (summary, not a substitute for the
full text):

- Include the full Apache-2.0 license text.
- Retain copyright, patent, trademark, and attribution notices.
- If a `NOTICE` file is present in the original project, include its contents.
- State significant changes if you modify the files.

Copyright for these components is held by their respective authors (Mozilla Foundation for
pdf.js; the tesseract.js / tesseract-ocr contributors for the OCR engines and language data).
