import { createWidget, widget, align, prop } from '@zos/ui'
import { back } from '@zos/router'
import { px } from '@zos/utils'
import { setPageBrightTime, stopPageBrightTime } from '@zos/display'
import { Vibrator, VIBRATOR_SCENE_SHORT_STRONG, VIBRATOR_SCENE_SHORT_MIDDLE } from '@zos/sensor'
import { Buzzer } from '@zos/sensor'
import { HeartRate } from '@zos/sensor'
import { onKey, offKey, KEY_UP, KEY_DOWN, KEY_SELECT, KEY_EVENT_CLICK } from '@zos/interaction'

let vib = null
let buzzer = null
let heartRate = null

// Hardcoded for T-Rex 3 Pro (480x480)
const SYSTEM_WIDTH = 480
const SYSTEM_HEIGHT = 480

const COLOR_WORK = 0x00FF99 // Neon Mint (Green)
const COLOR_REST = 0xAA00FF // Purple
const COLOR_READY = 0x00D4FF // Turquoise/Cyan
const COLOR_BG = 0x000000

Page({
    state: {
        workDuration: 20,
        restDuration: 10,
        totalLoops: 8,

        currentLoop: 1,
        currentPhase: 'READY',
        timeLeft: 5,

        timer: null,
        isPaused: false,
        pauseStartTime: 0,
        phaseStartTime: 0,
        phaseDuration: 0,

        totalTimeLeft: 0,

        // UI Widgets
        arcWidget: null,
        arcGlowWidget: null,
        arcGlowWidget2: null,
        arcGlowWidget3: null,
        timerTextWidget: null,
        timerLabelWidget: null,
        roundTextWidget: null,
        roundLabelWidget: null,
        totalTimeTextWidget: null,
        totalTimeLabelWidget: null,
        heartRateTextWidget: null,
        heartRateLabelWidget: null,

        centerX: 0,
        centerY: 0,
        radius: 0,

        currentHeartRate: 0
    },

    onInit(params) {
        if (params) {
            try {
                let p = JSON.parse(params)
                this.state.workDuration = parseInt(p.work)
                this.state.restDuration = parseInt(p.rest)
                this.state.totalLoops = parseInt(p.loops)
            } catch (e) {
                console.log('Params Parse Error', e)
            }
        }

        try {
            setPageBrightTime({ brightTime: 60 * 60 * 1000 })
        } catch (e) { }

        this.calculateTotalTime()
    },

    build() {
        console.log('Timer Build Start')
        const width = SYSTEM_WIDTH
        const height = SYSTEM_HEIGHT

        this.state.centerX = width / 2
        this.state.centerY = height / 2
        this.state.radius = Math.min(width, height) / 2 - px(20)

        // Black BG
        createWidget(widget.FILL_RECT, {
            x: 0, y: 0, w: width, h: height,
            color: COLOR_BG
        })

        // Progress Arc (Background Track)
        createWidget(widget.ARC, {
            x: 0, y: 0, w: width, h: height,
            radius: this.state.radius,
            start_angle: -90,
            end_angle: 270,
            color: 0x111111,
            line_width: px(3)
        })

        // Progress Arc Glow Layers (Outer to Inner)
        this.state.arcGlowWidget3 = createWidget(widget.ARC, {
            x: 0, y: 0, w: width, h: height,
            radius: this.state.radius,
            start_angle: -90,
            end_angle: 270,
            color: COLOR_READY,
            alpha: 15,
            line_width: px(10)
        })

        this.state.arcGlowWidget2 = createWidget(widget.ARC, {
            x: 0, y: 0, w: width, h: height,
            radius: this.state.radius,
            start_angle: -90,
            end_angle: 270,
            color: COLOR_READY,
            alpha: 30,
            line_width: px(6)
        })

        this.state.arcGlowWidget = createWidget(widget.ARC, {
            x: 0, y: 0, w: width, h: height,
            radius: this.state.radius,
            start_angle: -90,
            end_angle: 270,
            color: COLOR_READY,
            alpha: 60,
            line_width: px(4)
        })

        // Progress Arc (Active)
        this.state.arcWidget = createWidget(widget.ARC, {
            x: 0, y: 0, w: width, h: height,
            radius: this.state.radius,
            start_angle: -90,
            end_angle: 270,
            color: COLOR_READY,
            line_width: px(3)
        })

        // 4-section layout inspired by workout apps

        // TOP SECTION: Current Timer
        const topY = px(60)

        this.state.timerLabelWidget = createWidget(widget.TEXT, {
            x: 0,
            y: topY,
            w: width,
            h: px(40),
            text: 'READY',
            text_size: px(32),
            color: COLOR_READY,
            align_h: align.CENTER_H,
            align_v: align.CENTER_V
        })

        this.state.timerTextWidget = createWidget(widget.TEXT, {
            x: 0,
            y: topY + px(40),
            w: width,
            h: px(100),
            text: '5',
            text_size: px(100),
            color: 0xFFFFFF,
            align_h: align.CENTER_H,
            align_v: align.CENTER_V
        })

        // MIDDLE SECTIONS: Round (left) and Total Time (right)
        const midY = topY + px(160)

        // Round counter (left)
        createWidget(widget.TEXT, {
            x: 0,
            y: midY,
            w: width / 2,
            h: px(30),
            text: 'ROUND',
            text_size: px(24),
            color: 0x888888,
            align_h: align.CENTER_H,
            align_v: align.CENTER_V
        })

        this.state.roundTextWidget = createWidget(widget.TEXT, {
            x: 0,
            y: midY + px(35),
            w: width / 2,
            h: px(70),
            text: '1/8',
            text_size: px(60),
            color: 0xFFFFFF,
            align_h: align.CENTER_H,
            align_v: align.CENTER_V
        })

        // Total Time (right)
        createWidget(widget.TEXT, {
            x: width / 2,
            y: midY,
            w: width / 2,
            h: px(30),
            text: 'TOTAL TIME',
            text_size: px(24),
            color: 0x888888,
            align_h: align.CENTER_H,
            align_v: align.CENTER_V
        })

        this.state.totalTimeTextWidget = createWidget(widget.TEXT, {
            x: width / 2,
            y: midY + px(35),
            w: width / 2,
            h: px(70),
            text: this.formatTotalTime(this.state.totalTimeLeft),
            text_size: px(60),
            color: 0xFFFFFF,
            align_h: align.CENTER_H,
            align_v: align.CENTER_V
        })

        // BOTTOM SECTION: Heart Rate
        const bottomY = midY + px(135)

        // SEPARATORS - Brighter and Thicker
        // Horizontal (Top/Mid)
        createWidget(widget.FILL_RECT, {
            x: px(40), y: midY - px(10), w: width - px(80), h: px(2),
            color: 0x444444
        })
        // Horizontal (Mid/Bottom)
        createWidget(widget.FILL_RECT, {
            x: px(40), y: bottomY - px(10), w: width - px(80), h: px(2),
            color: 0x444444
        })
        // Vertical (Mid)
        createWidget(widget.FILL_RECT, {
            x: width / 2, y: midY + px(5), w: px(2), h: px(115),
            color: 0x444444
        })

        createWidget(widget.TEXT, {
            x: 0,
            y: bottomY,
            w: width,
            h: px(30),
            text: 'HEART RATE',
            text_size: px(24),
            color: 0x888888,
            align_h: align.CENTER_H,
            align_v: align.CENTER_V
        })


        this.state.heartRateTextWidget = createWidget(widget.TEXT, {
            x: 0,
            y: bottomY + px(35),
            w: width,
            h: px(70),
            text: '--',
            text_size: px(60),
            color: 0xFF6B6B,
            align_h: align.CENTER_H,
            align_v: align.CENTER_V
        })



        // Start heart rate monitoring - Throttled for battery
        try {
            console.log('Initializing HeartRate...')
            heartRate = new HeartRate()
            let lastUpdate = 0
            const hrCallback = () => {
                const now = Date.now()
                if (now - lastUpdate < 2000) return // Only update every 2 seconds

                const hr = heartRate.getCurrent()
                if (hr && hr > 0) {
                    lastUpdate = now
                    this.state.currentHeartRate = hr

                    // Dynamic Heart Rate Color Zones
                    let hrColor = 0xFFFFFF // White (< 100)
                    if (hr >= 160) {
                        hrColor = 0xFF4444 // Red
                    } else if (hr >= 140) {
                        hrColor = 0xFF9F00 // Orange
                    } else if (hr >= 120) {
                        hrColor = 0xFFE43D // Yellow
                    }

                    this.state.heartRateTextWidget.setProperty(prop.TEXT, `${hr}`)
                    this.state.heartRateTextWidget.setProperty(prop.COLOR, hrColor)
                }
            }
            heartRate.onCurrentChange(hrCallback)
        } catch (e) {
            console.log('HeartRate Error', e)
        }

        // Register hardware key listeners
        onKey({
            callback: (key, keyEvent) => {
                if (keyEvent !== KEY_EVENT_CLICK) return false

                if (key === KEY_SELECT) {
                    this.toggleTimer()
                    return true
                } else if (key === KEY_UP) {
                    this.skipRound(1) // Swapped: UP for next
                    return true
                } else if (key === KEY_DOWN) {
                    this.skipRound(-1) // Swapped: DOWN for back
                    return true
                }
                return false
            }
        })

        this.startReadyPhase()
    },

    onDestroy() {
        this.stopTimer()
        try {
            resetPageBrightTime()
            offKey()
            if (heartRate) heartRate.offCurrentChange()
        } catch (e) { }
    },

    calculateTotalTime() {
        this.state.totalTimeLeft = 5 + (this.state.workDuration + this.state.restDuration) * this.state.totalLoops
    },

    formatTotalTime(seconds) {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    },

    toggleTimer() {
        if (this.state.currentPhase === 'FINISHED') return

        if (this.state.isPaused) {
            this.state.isPaused = false
            const now = Date.now()
            const pauseDuration = now - this.state.pauseStartTime
            this.state.phaseStartTime += pauseDuration

            this.playFeedback('resume')

            this.state.timer = setInterval(() => {
                this.tick()
            }, 40)
        } else {
            this.state.isPaused = true
            this.state.pauseStartTime = Date.now()
            if (this.state.timer) {
                clearInterval(this.state.timer)
                this.state.timer = null
            }
            this.playFeedback('pause')
        }
    },

    skipRound(direction) {
        if (this.state.currentPhase === 'FINISHED') return

        if (this.state.isPaused) {
            this.state.isPaused = false
            if (!this.state.timer) {
                this.state.timer = setInterval(() => { this.tick() }, 40)
            }
        }

        if (direction > 0) {
            this.state.phaseDuration = 0
            this.state.phaseStartTime = 0
            this.tick()
        } else {
            if (this.state.currentPhase === 'READY') {
                this.state.phaseStartTime = Date.now()
                this.state.phaseDuration = 5000
            } else if (this.state.currentPhase === 'WORK') {
                if (this.state.currentLoop > 1) {
                    this.state.currentLoop--
                    this.state.currentPhase = 'REST'
                    this.state.phaseDuration = this.state.restDuration * 1000
                } else {
                    this.state.currentPhase = 'READY'
                    this.state.phaseDuration = 5000
                }
                this.state.phaseStartTime = Date.now()
            } else if (this.state.currentPhase === 'REST') {
                this.state.currentPhase = 'WORK'
                this.state.phaseDuration = this.state.workDuration * 1000
                this.state.phaseStartTime = Date.now()
            }
            this.updateUI(this.state.phaseDuration)
        }
    },

    startReadyPhase() {
        this.state.currentPhase = 'READY'
        this.state.timeLeft = 5
        this.state.phaseStartTime = Date.now()
        this.state.phaseDuration = 5000

        this.updateUI(this.state.phaseDuration)

        // Keep screen on during workout
        try {
            setPageBrightTime({ brightTime: 0 })
        } catch (e) { }

        if (this.state.timer) clearInterval(this.state.timer)
        this.state.timer = setInterval(() => {
            this.tick()
        }, 40)
    },

    startWorkPhase() {
        this.state.currentPhase = 'WORK'
        this.state.timeLeft = this.state.workDuration
        this.state.phaseStartTime = Date.now()
        this.state.phaseDuration = this.state.workDuration * 1000

        this.playFeedback('work')
        this.updateUI(this.state.phaseDuration)
    },

    startRestPhase() {
        if (this.state.currentLoop >= this.state.totalLoops) {
            this.finishWorkout()
            return
        }

        this.state.currentPhase = 'REST'
        this.state.timeLeft = this.state.restDuration
        this.state.phaseStartTime = Date.now()
        this.state.phaseDuration = this.state.restDuration * 1000

        this.playFeedback('rest')
        this.updateUI(this.state.phaseDuration)
    },

    tick() {
        const now = Date.now()
        const elapsed = now - this.state.phaseStartTime
        const remaining = Math.max(0, this.state.phaseDuration - elapsed)

        const seconds = Math.ceil(remaining / 1000)
        if (seconds !== this.state.timeLeft) {
            const diff = this.state.timeLeft - seconds
            this.state.timeLeft = seconds
            this.state.totalTimeLeft = Math.max(0, this.state.totalTimeLeft - diff)
            this.state.totalTimeTextWidget.setProperty(prop.TEXT, this.formatTotalTime(this.state.totalTimeLeft))

            // Countdown buzzer for Rest phase (last 3 seconds)
            if (this.state.currentPhase === 'REST' && seconds <= 3 && seconds > 0) {
                this.playFeedback('countdown')
            }
        }

        if (remaining <= 0) {
            if (this.state.currentPhase === 'READY') {
                this.startWorkPhase()
            } else if (this.state.currentPhase === 'WORK') {
                this.startRestPhase()
            } else if (this.state.currentPhase === 'REST') {
                this.state.currentLoop++
                this.startWorkPhase()
            }
        } else {
            this.updateUI(remaining)
        }
    },

    finishWorkout() {
        clearInterval(this.state.timer)
        this.state.timer = null
        this.state.currentPhase = 'FINISHED'
        this.state.timeLeft = 0

        // Show total time at the end instead of 0:00
        this.calculateTotalTime()

        this.playFeedback('finish')
        // Double buzzer sound for finish
        setTimeout(() => {
            try {
                if (this.state.currentPhase === 'FINISHED') {
                    this.playFeedback('finish')
                }
            } catch (e) { }
        }, 1000)

        this.updateUI(0)
    },

    stopTimer() {
        if (this.state.timer) {
            clearInterval(this.state.timer)
            this.state.timer = null
        }
        try {
            if (vib) vib.stop()
            if (buzzer) buzzer.stop()
        } catch (e) { }
    },

    playFeedback(type) {
        try {
            if (!vib) {
                vib = new Vibrator()
            }
            vib.stop()

            // Buzz-only for countdown (no vibration)
            if (type !== 'countdown') {
                if (type === 'work' || type === 'finish' || type === 'resume') {
                    vib.setMode(VIBRATOR_SCENE_SHORT_STRONG)
                } else if (type === 'pause') {
                    vib.setMode(VIBRATOR_SCENE_SHORT_MIDDLE)
                } else {
                    vib.setMode(VIBRATOR_SCENE_SHORT_MIDDLE)
                }
                vib.start()
            }
        } catch (e) {
            console.log('Vibration Error', e)
        }

        try {
            if (!buzzer) {
                buzzer = new Buzzer()
            }

            if (buzzer.isEnabled()) {
                const types = buzzer.getSourceType()
                let beepType

                if (type === 'work') {
                    beepType = types['ALARM']
                } else if (type === 'rest') {
                    beepType = types['REMIND_1']
                } else if (type === 'finish') {
                    beepType = types['SUCCESS']
                } else if (type === 'pause') {
                    beepType = types['REMIND_1']
                } else if (type === 'resume') {
                    beepType = types['SUCCESS']
                } else if (type === 'countdown') {
                    beepType = types['REMIND_1']
                }

                if (beepType !== undefined) {
                    buzzer.start(beepType)
                }
            }
        } catch (e) {
            console.log('Buzzer Error', e)
        }
    },

    updateUI(remainingMs) {
        const { currentPhase, timeLeft, currentLoop, totalLoops } = this.state

        if (currentPhase === 'FINISHED') {
            this.state.timerLabelWidget.setProperty(prop.TEXT, 'FINISHED')
            this.state.timerLabelWidget.setProperty(prop.COLOR, COLOR_WORK)
            this.state.timerTextWidget.setProperty(prop.TEXT, 'DONE')
            this.state.totalTimeTextWidget.setProperty(prop.TEXT, this.formatTotalTime(this.state.totalTimeLeft))
            return
        }

        this.state.timerTextWidget.setProperty(prop.TEXT, `${timeLeft}`)
        this.state.roundTextWidget.setProperty(prop.TEXT, `${currentLoop}/${totalLoops}`)

        // Update progress arc
        let progress = 0
        if (this.state.phaseDuration > 0) {
            progress = remainingMs / this.state.phaseDuration
        }
        const angle = -90 + (360 * progress)

        let phaseColor = COLOR_READY
        let phaseText = ''

        if (currentPhase === 'READY') {
            phaseColor = COLOR_READY
            phaseText = 'READY'
        } else if (currentPhase === 'WORK') {
            phaseColor = COLOR_WORK
            phaseText = 'WORK'
        } else if (currentPhase === 'REST') {
            phaseColor = COLOR_REST
            phaseText = 'REST'
        }

        this.state.timerLabelWidget.setProperty(prop.TEXT, phaseText)
        this.state.timerLabelWidget.setProperty(prop.COLOR, phaseColor)
        this.state.arcWidget.setProperty(prop.COLOR, phaseColor)
        this.state.arcWidget.setProperty(prop.MORE, { end_angle: angle })

        this.state.arcGlowWidget.setProperty(prop.COLOR, phaseColor)
        this.state.arcGlowWidget.setProperty(prop.MORE, { end_angle: angle })
        this.state.arcGlowWidget2.setProperty(prop.COLOR, phaseColor)
        this.state.arcGlowWidget2.setProperty(prop.MORE, { end_angle: angle })
        this.state.arcGlowWidget3.setProperty(prop.COLOR, phaseColor)
        this.state.arcGlowWidget3.setProperty(prop.MORE, { end_angle: angle })

    }
})
