const colors = ['#FF729F', '#FFB44C', '#AFE544', '#5BE5E0', '#9785F2']

function deterministicColor(index: number): string {
  return colors[index % colors.length]
}
export default deterministicColor
