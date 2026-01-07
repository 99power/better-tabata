import { createWidget, widget, event, align, prop, deleteWidget } from '@zos/ui'
import { push, back } from '@zos/router'
import { px } from '@zos/utils'
import { LocalStorage } from '@zos/storage'
import { onKey, offKey, KEY_SELECT, KEY_EVENT_CLICK, KEY_UP, KEY_DOWN } from '@zos/interaction'
import { onGesture, offGesture, GESTURE_RIGHT } from '@zos/interaction'

// Hardcoded for T-Rex 3 Pro (480x480)
const SYSTEM_WIDTH = 480
const SYSTEM_HEIGHT = 480

// Theme
const COLOR_ACCENT = 0x00FF99 // Neon Mint
const COLOR_TEXT = 0xFFFFFF
const COLOR_SUBTEXT = 0x888888
const COLOR_BG = 0x000000
const COLOR_CARD_BG = 0x1A1A1A
const COLOR_CARD_SELECTED = 0x333333
const COLOR_DELETE = 0xFF4444

const PRESETS_KEY = 'presets_list'

Page({
    state: {
        presets: [],
        storage: null,
        selectedIndex: 0,
        cardWidgets: [],
        emptyWidget: null
    },

    onInit() {
        try {
            this.state.storage = new LocalStorage()
            this.loadPresets()
        } catch (e) {
            console.log('Presets init error', e)
        }
    },

    loadPresets() {
        try {
            const saved = this.state.storage.getItem(PRESETS_KEY)
            if (saved) {
                this.state.presets = typeof saved === 'string' ? JSON.parse(saved) : saved
                if (!Array.isArray(this.state.presets)) {
                    this.state.presets = []
                }
            }
        } catch (e) {
            console.log('Load presets error', e)
            this.state.presets = []
        }
    },

    savePresets() {
        try {
            this.state.storage.setItem(PRESETS_KEY, JSON.stringify(this.state.presets))
        } catch (e) {
            console.log('Save presets error', e)
        }
    },

    build() {
        const width = SYSTEM_WIDTH
        const height = SYSTEM_HEIGHT

        // Black BG
        createWidget(widget.FILL_RECT, {
            x: 0, y: 0, w: width, h: height,
            color: COLOR_BG
        })

        // Header
        createWidget(widget.TEXT, {
            x: 0,
            y: px(30),
            w: width,
            h: px(50),
            text: 'PRESETS',
            text_size: px(36),
            color: COLOR_ACCENT,
            align_h: align.CENTER_H,
            align_v: align.CENTER_V
        })

        this.renderList()

        // Register hardware key listeners
        onKey({
            callback: (key, keyEvent) => {
                if (keyEvent !== KEY_EVENT_CLICK) return false

                if (key === KEY_SELECT) {
                    if (this.state.presets.length > 0) {
                        this.startPreset(this.state.selectedIndex)
                    }
                    return true
                } else if (key === KEY_UP) {
                    this.navigateUp()
                    return true
                } else if (key === KEY_DOWN) {
                    this.navigateDown()
                    return true
                }
                return false
            }
        })

        // Register swipe right gesture to go back
        onGesture({
            callback: (gesture) => {
                if (gesture === GESTURE_RIGHT) {
                    back()
                    return true
                }
                return false
            }
        })
    },

    renderList() {
        const width = SYSTEM_WIDTH
        const height = SYSTEM_HEIGHT
        const cardHeight = px(80)
        const cardSpacing = px(10)
        const startY = px(90)
        const cardMargin = px(50) // Increased margin to make cards narrower

        // Clear existing card widgets
        this.state.cardWidgets.forEach(widgets => {
            try {
                if (widgets.bg) deleteWidget(widgets.bg)
                if (widgets.title) deleteWidget(widgets.title)
                if (widgets.deleteBtn) deleteWidget(widgets.deleteBtn)
            } catch (e) { }
        })
        this.state.cardWidgets = []

        if (this.state.emptyWidget) {
            try {
                deleteWidget(this.state.emptyWidget)
            } catch (e) { }
            this.state.emptyWidget = null
        }

        if (this.state.presets.length === 0) {
            // Empty state
            this.state.emptyWidget = createWidget(widget.TEXT, {
                x: px(40),
                y: height / 2 - px(40),
                w: width - px(80),
                h: px(80),
                text: 'No presets yet.\nStart a workout to save.',
                text_size: px(24),
                color: COLOR_SUBTEXT,
                align_h: align.CENTER_H,
                align_v: align.CENTER_V
            })
            return
        }

        // Create cards for each preset
        this.state.presets.forEach((preset, index) => {
            const y = startY + index * (cardHeight + cardSpacing)
            const isSelected = index === this.state.selectedIndex

            // Card background
            const bg = createWidget(widget.FILL_RECT, {
                x: cardMargin,
                y: y,
                w: width - cardMargin * 2,
                h: cardHeight,
                radius: px(16),
                color: isSelected ? COLOR_CARD_SELECTED : COLOR_CARD_BG
            })

            // Title: Work/Rest × Loops (larger text, centered)
            const title = createWidget(widget.TEXT, {
                x: cardMargin + px(15),
                y: y,
                w: width - cardMargin * 2 - px(80),
                h: cardHeight,
                text: `${preset.work} + ${preset.rest} x ${preset.loops}`,
                text_size: px(42), // Made text bigger
                color: COLOR_TEXT,
                align_h: align.CENTER_H,
                align_v: align.CENTER_V
            })

            // Add touch event listener directly to the text widget
            title.addEventListener(event.CLICK_UP, () => {
                this.startPreset(index)
            })

            // Delete button (created last so it's on top)
            const deleteBtn = createWidget(widget.BUTTON, {
                x: width - cardMargin - px(60),
                y: y + px(15),
                w: px(50),
                h: px(50),
                text: '×',
                text_size: px(36),
                color: COLOR_DELETE,
                radius: px(25),
                normal_color: 0x2A2A2A,
                press_color: 0x4A4A4A,
                click_func: () => {
                    this.deletePreset(index)
                }
            })

            this.state.cardWidgets.push({ bg, title, deleteBtn })
        })
    },

    navigateUp() {
        if (this.state.presets.length === 0) return
        
        const oldIndex = this.state.selectedIndex
        this.state.selectedIndex = Math.max(0, this.state.selectedIndex - 1)
        
        if (oldIndex !== this.state.selectedIndex) {
            this.updateSelection(oldIndex, this.state.selectedIndex)
        }
    },

    navigateDown() {
        if (this.state.presets.length === 0) return
        
        const oldIndex = this.state.selectedIndex
        this.state.selectedIndex = Math.min(this.state.presets.length - 1, this.state.selectedIndex + 1)
        
        if (oldIndex !== this.state.selectedIndex) {
            this.updateSelection(oldIndex, this.state.selectedIndex)
        }
    },

    updateSelection(oldIndex, newIndex) {
        // Update old card
        if (this.state.cardWidgets[oldIndex] && this.state.cardWidgets[oldIndex].bg) {
            this.state.cardWidgets[oldIndex].bg.setProperty(prop.COLOR, COLOR_CARD_BG)
        }
        // Update new card
        if (this.state.cardWidgets[newIndex] && this.state.cardWidgets[newIndex].bg) {
            this.state.cardWidgets[newIndex].bg.setProperty(prop.COLOR, COLOR_CARD_SELECTED)
        }
    },


    startPreset(index) {
        const preset = this.state.presets[index]
        if (!preset) return

        // Navigate to timer with preset values
        push({
            url: 'page/timer',
            params: JSON.stringify({
                work: preset.work,
                rest: preset.rest,
                loops: preset.loops
            })
        })
    },

    deletePreset(index) {
        if (index < 0 || index >= this.state.presets.length) return
        
        // Remove preset
        this.state.presets.splice(index, 1)
        this.savePresets()
        
        // Adjust selected index if needed
        if (this.state.selectedIndex >= this.state.presets.length) {
            this.state.selectedIndex = Math.max(0, this.state.presets.length - 1)
        }
        
        // Re-render the list
        this.renderList()
    },

    onDestroy() {
        try {
            offKey()
            offGesture()
        } catch (e) { }
    }
})
