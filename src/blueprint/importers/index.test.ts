import { describe, expect, it } from 'vitest'
import { findImporter } from './index'
import { rasterImporter } from './rasterImporter'
import { pdfImporter } from './pdfImporter'

function fakeFile(name: string, type: string): File {
  return new File(['fake bytes'], name, { type })
}

describe('blueprint importer registry', () => {
  it('routes PNG/JPG/WEBP to the raster importer', () => {
    expect(findImporter(fakeFile('plan.png', 'image/png'))).toBe(rasterImporter)
    expect(findImporter(fakeFile('plan.jpg', 'image/jpeg'))).toBe(rasterImporter)
    expect(findImporter(fakeFile('plan.webp', 'image/webp'))).toBe(rasterImporter)
  })

  it('routes PDF to the pdf importer', () => {
    expect(findImporter(fakeFile('plan.pdf', 'application/pdf'))).toBe(pdfImporter)
  })

  it('returns null for an unsupported format', () => {
    expect(findImporter(fakeFile('plan.dxf', 'application/dxf'))).toBeNull()
  })

  it('the pdf importer clearly rejects until a real implementation lands', async () => {
    await expect(pdfImporter.import(fakeFile('plan.pdf', 'application/pdf'))).rejects.toThrow(/no está disponible/)
  })
})
