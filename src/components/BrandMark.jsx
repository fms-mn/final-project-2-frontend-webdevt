// The FILME logo mark: a cinema ticket with film sprocket holes along its edges and the F cut out
// of it. The cut-outs are real holes, so it sits on any background. Colour comes from CSS (.brand-mark).
const PATH = 'M10 12h44a4 4 0 0 1 4 4v9a6 6 0 0 0 0 12v10a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V37a6 6 0 0 0 0-12v-9a4 4 0 0 1 4-4zM11 15.4h3.6v3.6h-3.6zM18.4 15.4h3.6v3.6h-3.6zM25.8 15.4h3.6v3.6h-3.6zM33.2 15.4h3.6v3.6h-3.6zM40.6 15.4h3.6v3.6h-3.6zM48 15.4h3.6v3.6h-3.6zM11 45h3.6v3.6h-3.6zM18.4 45h3.6v3.6h-3.6zM25.8 45h3.6v3.6h-3.6zM33.2 45h3.6v3.6h-3.6zM40.6 45h3.6v3.6h-3.6zM48 45h3.6v3.6h-3.6zM25.44 23.8H38.56V27.57H29.87V30.36H36.76V33.97H29.87V40.2H25.44z';

export default function BrandMark({ className = '' }) {
  return (
    <svg className={`brand-mark ${className}`.trim()} viewBox="5 11 54 42" aria-hidden="true" focusable="false">
      <path fillRule="evenodd" d={PATH} />
    </svg>
  );
}
