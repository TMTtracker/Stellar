import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * Extract the text layer of a PDF in the browser. Scanned (image-only)
 * PDFs have no text layer and come back empty.
 * Returns { text, pages }.
 */
export async function extractPdfText(file, { onProgress } = {}) {
    const data = new Uint8Array(await file.arrayBuffer())
    const loadingTask = pdfjs.getDocument({ data })
    const pdf = await loadingTask.promise
    const numPages = pdf.numPages
    const pages = []

    try {
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            let text = ''
            for (const item of content.items) {
                if (!('str' in item)) continue
                text += item.str + (item.hasEOL ? '\n' : ' ')
            }
            pages.push(text.replace(/[ \t]+/g, ' ').trim())
            onProgress?.(i, numPages)
        }
    } finally {
        loadingTask.destroy()
    }

    return { text: pages.filter(Boolean).join('\n\n'), pages: numPages }
}
