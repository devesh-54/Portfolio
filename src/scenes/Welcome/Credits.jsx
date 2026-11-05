/** Small attribution line in the bottom-left corner for third-party assets. */
export function Credits({ inline = false, className, style } = {}) {
  const classes = className || (inline ? 'credits-inline' : 'credits')
  return (
    <div className={classes} style={{ display: 'flex', flexDirection: 'column', gap: '2px', ...style }}>
      <div>
        Curved Monitor by <span style={{ fontWeight: 600 }}>Arnau Rocher Alcayde</span> [<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC-BY-4.0</a>], modified (simplified)
      </div>
      <div>
        Gaming computer by <span style={{ fontWeight: 600 }}>Marcseus</span> [<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC-BY-4.0</a>], modified (simplified)
      </div>
      <div>
        Sketch material by{' '}
        <a href="https://github.com/abhishekmill/R3FSketchMaterial" target="_blank" rel="noreferrer">
          Abhishek Verma (R3FSketchMaterial)
        </a>
      </div>
    </div>
  )
}

export default Credits
