// afterPack hook: embed icon.ico into the Windows exe without wine/rcedit.
const fs = require('fs')
const path = require('path')
exports.default = async function (ctx) {
  if (ctx.electronPlatformName !== 'win32') return
  const { NtExecutable, NtExecutableResource, Resource, Data } = await import('resedit')
  const exePath = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.exe`)
  const exe = NtExecutable.from(fs.readFileSync(exePath))
  const res = NtExecutableResource.from(exe)
  const ico = Data.IconFile.from(fs.readFileSync(path.join(ctx.packager.projectDir, 'icon.ico')))
  const groups = Resource.IconGroupEntry.fromEntries(res.entries)
  const id = groups.length ? groups[0].id : 1
  const lang = groups.length ? groups[0].lang : 1033
  Resource.IconGroupEntry.replaceIconsForResource(res.entries, id, lang, ico.icons.map((i) => i.data))
  res.outputResource(exe)
  fs.writeFileSync(exePath, Buffer.from(exe.generate()))
}
