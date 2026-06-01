import type { CellStyle as OurCellStyle, CellBorder, BorderStyleItem } from '../types/style'
import type { CellStyle as HucreCellStyle, FontStyle, FillStyle, BorderStyle, BorderSide, AlignmentStyle, Color, BorderLineStyle, PatternFill } from 'hucre'

/**
 * 将十六进制颜色（如 '#FF0000'）转换为 hucre Color（无 #）
 */
function hexToColor(hex?: string): Color | undefined {
  if (!hex) return undefined
  const rgb = hex.replace('#', '').trim()
  if (rgb.length !== 6 && rgb.length !== 3) return undefined
  return { rgb: rgb.length === 3 ? rgb.split('').map(c => c + c).join('') : rgb }
}

/**
 * 将 BorderStyleItem 转换为 hucre BorderSide
 */
function toBorderSide(border?: boolean | BorderStyleItem): BorderSide | undefined {
  if (border === undefined || border === false) return undefined
  if (border === true) {
    return { style: 'thin' as BorderLineStyle }
  }
  return {
    style: (border.style || 'thin') as BorderLineStyle,
    color: hexToColor(border.color),
  }
}

/**
 * 将我们的 CellStyle 转换为 hucre 的 CellStyle
 */
export function toHucreCellStyle(style?: Partial<OurCellStyle>): HucreCellStyle | undefined {
  if (!style) return undefined

  const font: FontStyle = {}
  const hucreStyle: HucreCellStyle = {}

  if (style.fontName) font.name = style.fontName
  if (style.fontSize) font.size = style.fontSize
  if (style.bold !== undefined) font.bold = style.bold
  if (style.italic !== undefined) font.italic = style.italic
  if (style.fontColor) font.color = hexToColor(style.fontColor)

  if (Object.keys(font).length > 0) {
    hucreStyle.font = font
  }

  // 背景色 → PatternFill
  if (style.bgColor) {
    const bgColor = hexToColor(style.bgColor)
    if (bgColor) {
      hucreStyle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: bgColor,
      }
    }
  }

  // 边框
  if (style.border) {
    const border: BorderStyle = {}
    const b = style.border
    border.top = toBorderSide(b.top)
    border.bottom = toBorderSide(b.bottom)
    border.left = toBorderSide(b.left)
    border.right = toBorderSide(b.right)
    if (Object.keys(border).length > 0) {
      hucreStyle.border = border
    }
  }

  // 对齐
  if (style.align || style.verticalAlign) {
    const alignment: AlignmentStyle = {}
    if (style.align) alignment.horizontal = style.align
    if (style.verticalAlign) {
      // hucre 使用 'center' 而非 'middle'
      alignment.vertical = style.verticalAlign === 'middle' ? 'center' : style.verticalAlign
    }
    hucreStyle.alignment = alignment
  }

  return Object.keys(hucreStyle).length > 0 ? hucreStyle : undefined
}

/**
 * 创建默认表头样式
 */
export function defaultHeaderStyle(): HucreCellStyle {
  return {
    font: { bold: true, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'F0F0F0' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  }
}

/**
 * 创建默认分组表头样式
 */
export function defaultGroupHeaderStyle(): HucreCellStyle {
  return {
    font: { bold: true, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'D9E2F3' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  }
}

/**
 * 创建默认数据行样式
 */
export function defaultCellStyle(): HucreCellStyle {
  return {
    alignment: { vertical: 'center' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  }
}
