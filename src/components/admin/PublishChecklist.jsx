import { FiCheck, FiMinus, FiAlertCircle, FiUploadCloud } from 'react-icons/fi';
import { predictOutcome, readiness } from '../../utils/publishReadiness';
import './publishChecklist.css';

const ICON = { ok: FiCheck, blocked: FiAlertCircle, optional: FiMinus };

// What a draft movie still needs before customers can see it, one row each with the button that
// fixes it, and what customers will see once it is published. `bookable` is null while the
// movie's showings are still loading.
export default function PublishChecklist({ movie, bookable, busy, onAction, onPublish }) {
  const loading = bookable === null || bookable === undefined;
  const result = readiness(movie, { bookable: bookable || 0 });
  const outcome = predictOutcome({ releaseDate: movie.releaseDate, bookable: bookable || 0 });
  const canPublish = !loading && result.ready;

  return (
    <section className="publish-card" aria-labelledby="publish-card-title">
      <div className="publish-main">
        <div className="publish-head">
          <h3 id="publish-card-title">{canPublish ? 'Ready to publish' : `Ready to publish? ${result.done} of ${result.required} done`}</h3>
          <div className="publish-progress" role="progressbar" aria-valuemin={0} aria-valuemax={result.required} aria-valuenow={result.done} aria-label="Publishing checklist"><i style={{ width: `${(result.done / result.required) * 100}%` }} /></div>
        </div>
        <ul className="publish-checks">
          {result.items.map((item) => {
            const Icon = ICON[item.state];
            return (
              <li key={item.key} className={`publish-check ${item.state}`}>
                <span className="publish-check-icon" aria-hidden="true"><Icon /></span>
                <div><b>{loading && item.key === 'showings' ? 'Checking showings…' : item.title}</b><p>{item.text}</p></div>
                {item.action && <button type="button" className={`movie-button ${item.state === 'blocked' ? 'movie-button-primary' : 'movie-button-outline'} publish-check-action`} onClick={() => onAction(item.action)}>{item.action.label}</button>}
              </li>
            );
          })}
        </ul>
        <p className={`publish-banner ${canPublish ? 'ok' : 'bad'}`} role="status">
          {loading ? 'Checking what is scheduled…'
            : canPublish ? 'Everything is in place. Publishing makes it visible to customers straight away.'
              : `One thing to fix before you can publish: ${result.blocker.toLowerCase()}.`}
        </p>
        <div className="publish-foot">
          <span>{canPublish ? 'You can take it off sale later from the Remove tab.' : 'Publish unlocks when every required item has a check.'}</span>
          <button type="button" className="movie-button movie-button-primary" disabled={!canPublish || busy} onClick={onPublish}>
            <FiUploadCloud aria-hidden="true" /> {busy ? 'Publishing…' : `Publish ${movie.title}`}
          </button>
        </div>
      </div>

      <aside className="publish-outcome" aria-label="What customers will see">
        <span className="publish-outcome-label">After publishing, customers see</span>
        <div className="publish-outcome-card">
          <span className={`publish-outcome-tag ${outcome.tone}`}>{outcome.label}</span>
          <b>{movie.title}</b>
          <small>{outcome.line}</small>
        </div>
        <ul className="publish-where">
          {outcome.where.map(([name, yes, note]) => <li key={name}><span>{name}</span><span className={yes ? 'yes' : 'no'}>{yes ? 'Yes' : 'No'}{note ? ` · ${note}` : ''}</span></li>)}
        </ul>
      </aside>
    </section>
  );
}
