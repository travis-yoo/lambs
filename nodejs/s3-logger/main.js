import handler from './index.js'

async function request() {
  const response = await handler({
    "message": "Hell, World!"
  })

  return response
}

(async function main() {
  const r = await request()
  console.log(r)
})()
