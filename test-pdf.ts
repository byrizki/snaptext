import { definePDFJSModule, getResolvedPDFJS } from "unpdf";

async function main() {
  await definePDFJSModule(() => import('pdfjs-dist/legacy/build/pdf.js'));
  const { version } = await getResolvedPDFJS();
  console.log("PDF.js legacy version: ", version);
}
main().catch(console.error);
