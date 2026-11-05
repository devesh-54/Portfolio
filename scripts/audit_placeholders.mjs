import { CONFIG, createCards, getCardTransform } from '../../template-analysis/templateMotion.js'

const cards = createCards(CONFIG)
console.log('Total cards generated:', cards.length)

// If localX is too close to center, gently push it outward so the center lane is reserved for real projects
for (let i = 7; i < cards.length; i++) {
  const card = cards[i]
  const sign = card.localX >= 0 ? 1 : -1
  if (Math.abs(card.localX) < 180) {
    card.localX = sign * (180 + Math.abs(card.localX))
  }
}

let centerCrossings = 0
for (let i = 7; i < cards.length; i++) {
  const card = cards[i]
  for (let s = 0; s <= 200; s++) {
    const p = s / 200
    const t = getCardTransform(card, p, CONFIG)
    const d = 15.0 - t.position.z
    if (d > 0.4 && d < 7.0) {
      if (Math.abs(t.position.x) < 1.0 && Math.abs(t.position.y) < 0.8) {
        centerCrossings++
        console.log(`Card ${i} crosses center: p=${p.toFixed(2)}, d=${d.toFixed(2)}, x=${t.position.x.toFixed(2)}, y=${t.position.y.toFixed(2)}`)
      }
    }
  }
}
console.log('Total placeholder center crossings near lens after clearing:', centerCrossings)

