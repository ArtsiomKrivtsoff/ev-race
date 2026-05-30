const SUPABASE_URL = 'YOUR_SUPABASE_URL'
  const container = document.getElementById('operators-list')

  const sorted = [...data].sort((a,b)=>b.total-a.total)

  container.innerHTML = sorted.map((op, index) => {

    const color = OPERATOR_COLORS[op.operator] || '#00ff66'

    const progress = Math.min((op.total / 250) * 100, 100)

    return `

      <article
        class="operator-card"
        style="color:${color}"
      >

        <div class="rank-box">
          ${index + 1}
        </div>

        <div>

          <div class="operator-name">
            ${op.operator}
          </div>

          <div class="operator-state">
            ${op.activity_state || 'сезон продолжается'}
          </div>

          <div class="progress-bar">
            <div
              class="progress-fill"
              style="width:${progress}%; background:${color}"
            ></div>
          </div>

        </div>

        <div class="operator-total">
          <div class="operator-total-value">
            ${op.total}
          </div>
          <div>станций</div>
        </div>

        <div class="operator-growth">
          +${op.new_week || 0}
          <br>
          <small>за неделю</small>
        </div>

      </article>

    `

  }).join('')
}

function updateCountdown() {

  const finalDate = new Date('2026-12-31T23:59:59')

  function tick() {

    const now = new Date()
    const diff = finalDate - now

    const days = Math.floor(diff / 1000 / 60 / 60 / 24)
    const hours = Math.floor(diff / 1000 / 60 / 60) % 24
    const minutes = Math.floor(diff / 1000 / 60) % 60
    const seconds = Math.floor(diff / 1000) % 60

    document.getElementById('countdown-days').textContent = days
    document.getElementById('count-hours').textContent = hours
    document.getElementById('count-minutes').textContent = minutes
    document.getElementById('count-seconds').textContent = seconds
  }

  tick()
  setInterval(tick, 1000)
}

async function init() {

  updateCountdown()

  const data = await fetchSummary()

  renderOperators(data)
}

init()