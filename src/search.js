let dp = require('despair')
let fs = require('fs')
let readline = require('readline')
let data = JSON.parse(fs.readFileSync('master.json', { encoding: 'utf-8' }))

function showMatches (input, size) {
  if (!size) size = process.stdout.rows
  let matches = dp.match(data, 'name', input)
  matches.length = matches.length > size ? size : matches.length
  process.stdout.clearLine()
  clearLines()
  for (let i = 0; i < matches.length; i++) {
    process.stdout.cursorTo(0)
    process.stdout.moveCursor(0, -1)
    process.stdout.write(`${dp.color('bd', matches[i].name)}`)
  }
  process.stdout.cursorTo(0, process.stdout.rows - 1)
  process.stdout.write(input)
}

function clearLines () {
  for (let i = 0; i < process.stdout.rows; i++) {
    process.stdout.moveCursor(0, -1)
    process.stdout.clearLine()
  }
  process.stdout.cursorTo(0, process.stdout.rows - 1)
  process.stdout.clearLine()
}

function main () {
  let str = ''
  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.on('line', input => {
    if (!input.trim()) return
    let prop = 'name'
    if (input.endsWith('/')) {
      prop = 'folder'
      input = input.substring(0, input.length - 1)
    }
    let matches = dp.match(data, prop, input)
    if (matches.length) {
      let item = matches[0]
      let url = item.path[Math.floor(Math.random() * item.path.length)]
      playSound('https://raw.githubusercontent.com/' + url)
    }
  })

  process.stdin.on('data', input => {
    let key = input.toString().charCodeAt(0)
    if (key === 13) {
      str = ''
      return
    }
    if (key === 8) {
      str = str.substring(0, str.length - 1)
    } else str += input.toString()
    if (str.trim()) showMatches(str)
    else clearLines()
  })
} main()

function playSound (url) {
  console.log(url)
}
