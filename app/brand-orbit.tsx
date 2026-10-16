/** Original flat sticker artwork. Decorative only; never a metric or status. */
export function BrandOrbit({className = ''}:{className?:string}) {
  return <svg className={`brand-orbit ${className}`} viewBox="0 0 280 190" fill="none" aria-hidden="true" focusable="false">
    <path className="orbit-outline" d="M61 133C26 109 49 40 102 39c55-1 46 108 104 108 38 0 57-55 22-76-39-24-132 111-167 62Z"/>
    <path className="orbit-ribbon" d="M61 133C26 109 49 40 102 39c55-1 46 108 104 108 38 0 57-55 22-76-39-24-132 111-167 62Z"/>
    <path className="orbit-star" d="m222 17 6 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 17-2Z"/>
    <circle className="orbit-dot" cx="46" cy="169" r="12"/>
  </svg>;
}
