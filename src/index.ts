import { freelizer } from 'freelizer'

;(async function () {
    try {
      const { start, subscribe } = await freelizer()
      start()
      subscribe(console.log)
    } catch (error) {
      // Error handling goes here
    }
})()

