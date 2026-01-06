import { createWidget, widget, event, align, prop } from '@zos/ui'
import { push } from '@zos/router'
import { px } from '@zos/utils'
import { LocalStorage } from '@zos/storage'
import { onKey, offKey, KEY_SELECT, KEY_EVENT_CLICK } from '@zos/interaction'

// Hardcoded for T-Rex 3 Pro (480x480)
const SYSTEM_WIDTH = 480
const SYSTEM_HEIGHT = 480

// Theme (Zepp OS 4.0 System Colors)
const COLOR_ACCENT = 0x00FF99 // Neon Mint (Start)
const COLOR_ERROR = 0xFF4444  // Red
const COLOR_TEXT = 0xFFFFFF
const COLOR_SUBTEXT = 0x888888
const COLOR_BTN_BG = 0x222222
const COLOR_BTN_PRESS = 0x333333

// Default values
const DEFAULT_WORK = 20
const DEFAULT_REST = 10
const DEFAULT_LOOPS = 8

Page({
  state: {
    workTime: DEFAULT_WORK,
    restTime: DEFAULT_REST,
    loopCount: DEFAULT_LOOPS,

    // Widget Refs
    workTimeText: null,
    restTimeText: null,
    loopCountText: null,

    // Storage instance
    storage: null
  },

  onInit() {
    try {
      this.state.storage = new LocalStorage()

      // Load each value separately with null checks
      const work = this.state.storage.getItem('work_time')
      const rest = this.state.storage.getItem('rest_time')
      const loops = this.state.storage.getItem('loop_count')

      console.log('Raw loaded values:', work, rest, loops)

      if (work !== null && work !== undefined) {
        this.state.workTime = typeof work === 'number' ? work : parseInt(work)
      }
      if (rest !== null && rest !== undefined) {
        this.state.restTime = typeof rest === 'number' ? rest : parseInt(rest)
      }
      if (loops !== null && loops !== undefined) {
        this.state.loopCount = typeof loops === 'number' ? loops : parseInt(loops)
      }

      console.log('Final loaded:', this.state.workTime, this.state.restTime, this.state.loopCount)
    } catch (e) {
      console.log('Load Settings Error', e)
    }
  },

  build() {
    const width = SYSTEM_WIDTH
    const height = SYSTEM_HEIGHT

    const rowHeight = px(100)
    const startY = px(50)

    const safeLeft = (width - px(380)) / 2

    // Helper to create a row
    const createRow = (label, y, valueKey, step, min, max) => {
      const centerY = y + rowHeight / 2

      // Label
      createWidget(widget.TEXT, {
        x: safeLeft,
        y: y,
        w: px(100),
        h: rowHeight,
        text: label,
        text_size: px(32),
        color: COLOR_SUBTEXT,
        align_v: align.CENTER_V
      })

      const btnSize = px(80)

      // Minus Button
      createWidget(widget.BUTTON, {
        x: safeLeft + px(100),
        y: centerY - btnSize / 2,
        w: btnSize,
        h: btnSize,
        text: '-',
        text_size: px(50),
        color: COLOR_ACCENT,
        radius: btnSize / 2,
        normal_color: COLOR_BTN_BG,
        press_color: COLOR_BTN_PRESS,
        click_func: () => {
          let v = this.state[valueKey] - step
          if (v < min) v = min
          this.state[valueKey] = v
          this.updateRow(valueKey)
        }
      })

      // Value Text
      this.state[valueKey + 'Text'] = createWidget(widget.TEXT, {
        x: safeLeft + px(180),
        y: y,
        w: px(100),
        h: rowHeight,
        text: `${this.state[valueKey]}`,
        text_size: px(46),
        color: COLOR_TEXT,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V
      })

      // Plus Button
      createWidget(widget.BUTTON, {
        x: safeLeft + px(280),
        y: centerY - btnSize / 2,
        w: btnSize,
        h: btnSize,
        text: '+',
        text_size: px(50),
        color: COLOR_ACCENT,
        radius: btnSize / 2,
        normal_color: COLOR_BTN_BG,
        press_color: COLOR_BTN_PRESS,
        click_func: () => {
          let v = this.state[valueKey] + step
          if (v > max) v = max
          this.state[valueKey] = v
          this.updateRow(valueKey)
        }
      })
    }

    createRow('WORK', startY, 'workTime', 5, 5, 300)
    createRow('REST', startY + rowHeight, 'restTime', 5, 0, 300)
    createRow('REPS', startY + rowHeight * 2, 'loopCount', 1, 1, 50)

    // Bottom buttons row - Centered group
    const resetWidth = px(120)
    const goWidth = px(160)
    const spacing = px(20)
    const totalWidth = resetWidth + spacing + goWidth
    const startX = (width - totalWidth) / 2
    const btnY = height - px(130)
    const btnHeight = px(90)

    // Reset Button
    createWidget(widget.BUTTON, {
      x: startX,
      y: btnY,
      w: resetWidth,
      h: btnHeight,
      text: 'RESET',
      text_size: px(30),
      color: COLOR_TEXT,
      radius: btnHeight / 2,
      normal_color: COLOR_BTN_BG,
      press_color: COLOR_BTN_PRESS,
      click_func: () => {
        this.state.workTime = DEFAULT_WORK
        this.state.restTime = DEFAULT_REST
        this.state.loopCount = DEFAULT_LOOPS
        this.updateRow('workTime')
        this.updateRow('restTime')
        this.updateRow('loopCount')
      }
    })

    // GO Button
    createWidget(widget.BUTTON, {
      x: startX + resetWidth + spacing,
      y: btnY,
      w: goWidth,
      h: btnHeight,
      text: 'GO',
      text_size: px(36),
      color: 0x000000,
      radius: btnHeight / 2,
      normal_color: COLOR_ACCENT,
      press_color: 0x00CC7A,
      click_func: () => {
        this.startWorkout()
      }
    })


    // Register SELECT key to start workout
    onKey({
      callback: (key, keyEvent) => {
        if (key === KEY_SELECT && keyEvent === KEY_EVENT_CLICK) {
          this.startWorkout()
          return true
        }
        return false
      }
    })
  },

  onDestroy() {
    try {
      offKey()
    } catch (e) { }
  },

  startWorkout() {
    // Save Settings
    try {
      console.log('Saving settings...', this.state.workTime, this.state.restTime, this.state.loopCount)
      if (!this.state.storage) {
        this.state.storage = new LocalStorage()
      }
      this.state.storage.setItem('work_time', Number(this.state.workTime))
      this.state.storage.setItem('rest_time', Number(this.state.restTime))
      this.state.storage.setItem('loop_count', Number(this.state.loopCount))
      console.log('Save SUCCESS')
    } catch (e) {
      console.log('Save Settings Error', e)
    }

    push({
      url: 'page/timer',
      params: JSON.stringify({
        work: this.state.workTime,
        rest: this.state.restTime,
        loops: this.state.loopCount
      })
    })
  },

  updateRow(key) {
    if (this.state[key + 'Text']) {
      this.state[key + 'Text'].setProperty(prop.TEXT, `${this.state[key]}`)
    }
  }
})
