import 'dotenv/config'
import { createServer } from './server.js'

const PORT = Number(process.env.PORT || 3001)

const app = createServer()

app.listen(PORT, () => {
  console.log(`AI Novel Creator server running on http://localhost:${PORT}`)
})
