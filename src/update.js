let dp = require('despair')
let path = require('path')
let got = require('got')
let fs = require('fs')
let key = 'token ' + process.env.GITHUB_TOKEN
let baseUrl = 'https://api.github.com/repos/Metastruct/garrysmod-chatsounds/git/trees/'
let luaUrl = 'https://raw.githubusercontent.com/Metastruct/garrysmod-chatsounds/master/lua/chatsounds/lists_send/'
let metaUrl = 'Metastruct/garrysmod-chatsounds/master/sound/chatsounds/autoadd/'
let mainRepo = 'sourcesounds'
let save = {
  meta: path.join(__dirname, 'data', 'meta.json'),
  game: path.join(__dirname, 'data', 'game'),
  master: 'master.json'
}

async function updateMetaJSON (tree = { name: 'master', sha: 'master' }) {
  reWrite(`${dp.color('ye', 'Meta')}: ${dp.color('bl', 'Fetching repo...')} [${tree.name}]`)
  let url = baseUrl + tree.sha
  let { body } = await got(url, { json: true, headers: { Authorization: key } })
  let check = body.tree.find(x => x.path === 'sound' || x.path === 'chatsounds' || x.path === 'autoadd')
  if (check) {
    let url = check.sha + (check.path === 'autoadd' ? '?recursive=1' : '')
    let body = await updateMetaJSON({ name: check.path, sha: url })
    return body
  }
  let res = body.tree.map(x => x.path).filter(x => x.endsWith('.ogg'))
  res = res.map(item => {
    let parts = item.split('/')
    let name = parts[1].replace(/.ogg$/, '')
    return { folder: parts[0], name: name, path: [item] }
  })
  let total = res.length
  for (let i = 0; i < res.length; i++) {
    if (res[i].name.endsWith('.ogg')) {
      res[i].name = res[i].name.replace(/.ogg$/, '')
    } else {
      let name = res[i].name
      let n = 1
      while (true) {
        if (i + n < res.length && res[i + n].name === name) {
          res[i].path = res[i].path.concat(res[i + n].path)
          res[i + n].delete = true
        } else break
        n++
      }
      i += n
    }
  }
  res = res.filter(x => !x.delete)
  fs.writeFileSync(save.meta, JSON.stringify(res, null, 2))
  reWrite(`${dp.color('ye', 'Meta')}: ${dp.color('bl', 'Done!')} (${total} Sounds > ${res.length} Items)\n`)
}

async function updateGameFolder (tree = { name: 'master', sha: 'master' }) {
  reWrite(`${dp.color('ye', 'Game')}: ${dp.color('bl', 'Fetching repo...')} [${tree.name}]`)
  let url = baseUrl + tree.sha
  let { body } = await got(url, { json: true, headers: { Authorization: key } })
  let check = body.tree.find(x => x.path === 'lua' || x.path === 'chatsounds' || x.path === 'lists_send')
  if (check) {
    let url = check.sha + (check.path === 'lists_send' ? '?recursive=1' : '')
    let body = await updateGameFolder({ name: check.path, sha: url })
    return body
  }
  let urls = body.tree.map(x => x.path).filter(x => x.endsWith('.lua'))
  let res = {}
  urls.forEach(x => { res[x.split('/')[0]] = [] })
  let lastGame = null
  let total = null
  for (let i = 0; i < urls.length; i++) {
    let url = luaUrl + urls[i]
    let game = urls[i].split('/')[0]
    if (lastGame !== game) {
      lastGame = game
      reWrite(`${dp.color('ye', 'Game')}: ${dp.color('bl', 'Parsing lua...')} [${game}]`)
    }
    let { body } = await got(url)
    body = parseLua(body)
    if (body.length) {
      total += body.map(x => x.path.length).reduce((a, b) => a + b, 0)
      res[game].push(body)
    }
  }
  if (!fs.existsSync(save.game)) fs.mkdirSync(save.game)
  let size = 0
  for (let game in res) {
    if (!res[game].length) continue
    let filePath = path.join(save.game, game + '.json')
    let arr = [].concat.apply([], res[game])
    size += arr.length
    fs.writeFileSync(filePath, JSON.stringify(arr, null, 2))
  }
  reWrite(`${dp.color('ye', 'Game')}: ${dp.color('bl', 'Done!')} (${total} Sounds > ${size} Items)\n`)
}

async function updateMasterJSON () {
  let read = x => JSON.parse(fs.readFileSync(x, { encoding: 'utf-8' }))
  let data = read(save.meta)
  let games = fs.readdirSync(save.game)
  for (let i = 0; i < games.length; i++) data.push(...read(path.join(save.game, games[i])))
  let total = data.length
  data = data.filter((x, i, a) => {
    let o = a.findIndex(x => x.name === data[i].name)
    if (data[o].folder && data[o].folder.constructor !== Array) data[o].folder = [data[o].folder]
    if (data[i].folder && data[i].folder.constructor !== Array) data[i].folder = [data[i].folder]
    if (i !== o) {
      if (data[o].folder && data[i].folder) data[o].folder = data[o].folder.concat(...data[i].folder)
      data[o].path.push(...data[i].path)
      return false
    }
    reWrite(`${dp.color('ye', 'Master')}: ${dp.color('bl', 'Combining files...')} [${i}/${data.length}] ${(((i / data.length)) * 100).toFixed(2)}%`)
    return true
  })
  fs.writeFileSync(save.master, JSON.stringify(data, null, 2), { encoding: 'utf-8' })
  reWrite(`${dp.color('ye', 'Master')}: ${dp.color('bl', 'Done!')} (${total} Items > ${data.length} Items)\n`)
}

async function updatePaths () {
  let repo = mainRepo
  reWrite(`${dp.color('ye', 'Path')}: ${dp.color('bl', 'Fetching repos...')} [${repo}]`)
  let url = `https://api.github.com/users/${repo}/repos`
  let { body } = await got(url, { json: true, headers: { Authorization: key } })
  let res = []
  for (let i = 0; i < body.length; i++) {
    let item = body[i]
    let url = `https://raw.githubusercontent.com/${item.full_name}/master/path.txt`
    reWrite(`${dp.color('ye', 'Path')}: ${dp.color('bl', 'Reading repos...')} [${item.name}]`)
    let paths = (await got(url)).body
    paths = paths.split('\n').map(x => item.full_name + '/master/' + x.replace(/\\/g, '/'))
    if (paths[paths.length - 1] === '') paths.length -= 1
    res.push(...paths)
  }
  let metaPath = path.join(__dirname, 'data', 'meta.json')
  if (fs.existsSync(metaPath)) {
    let data = JSON.parse(fs.readFileSync(metaPath, { encoding: 'utf-8' }))
    data.forEach(x => {
      let links = x.path.map(x => (metaUrl + x).replace(/\\\\/g, '/'))
      res.push(...links)
    })
  }
  let master = JSON.parse(fs.readFileSync(save.master, { encoding: 'utf-8' }))
  let total = 0
  master = master.map((item, i, a) => {
    reWrite(`${dp.color('ye', 'Path')}: ${dp.color('bl', 'Adding paths to master...')} [${i}/${a.length}] ${(((i / a.length)) * 100).toFixed(2)}%`)
    item.path = item.path.map(x => {
      let url = res.find(y => y.indexOf(x) >= 0)
      if (!url) url = res.find(y => y.indexOf(x.replace(/.wav$/, '.mp3')) >= 0)
      if (url) {
        total++
        x = url
      } else {
        x = ''
      }
      return x
    }).filter(x => x !== '')
    if (!item.path.length) item.delete = true
    return item
  }).filter(x => !x.delete)
  fs.writeFileSync(save.master, JSON.stringify(master, null, 2), { encoding: 'utf-8' })
  reWrite(`${dp.color('ye', 'Path')}: ${dp.color('bl', 'Done!')} (${res.length} Paths > ${total} URLs)\n`)
}

function reWrite (msg) {
  process.stdout.cursorTo(0)
  process.stdout.clearLine()
  process.stdout.write(msg)
}

function parseLua (data) {
  let lines = data.split('\n')
  let res = []
  for (let line of lines) {
    if (!line.startsWith('L')) continue
    let match = line.match(/".*?"/g)
    if (match) {
      match = match.map(x => x.substring(1, x.length - 1))
      let name = match[0]
      let path = match.splice(1)
      res.push({ name: name, path: path })
    }
  }
  return res
}

async function main () {
  await updateMetaJSON()
  await updateGameFolder()
  await updateMasterJSON()
  await updatePaths()
} main()
