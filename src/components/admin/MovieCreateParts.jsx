import { useEffect, useState } from 'react';
import { durationText } from '../../utils/movieForm';
import { splitGenres } from '../../utils/genres';
import { predictOutcome, releaseNote } from '../../utils/publishReadiness';
import './movieCreate.css';

const STEPS = [['Details', 'Title, poster, dates'], ['Showings', 'When and where'], ['Publish', 'Go live']];

// Where a new movie is in its journey: details, showings, publish. `current` is 1 to 3; earlier
// steps show a check.
export function CreateSteps({ current }) {
  return (
    <ol className="create-steps" aria-label="Steps to put a movie on sale">
      {STEPS.map(([title, hint], index) => {
        const number = index + 1;
        const state = number < current ? 'done' : number === current ? 'current' : 'todo';
        return (
          <li key={title} className={`create-step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="create-step-dot" aria-hidden="true">{state === 'done' ? '✓' : number}</span>
            <span><b>{title}</b><small>{hint}</small></span>
          </li>
        );
      })}
    </ol>
  );
}

// Age rating as four buttons: one tap, nothing to open.
export function RatingChips({ value, options, onChange }) {
  return (
    <fieldset className="create-rating">
      <legend className="movie-field-label">Age rating</legend>
      <div className="create-chips" role="radiogroup" aria-label="Age rating">
        {options.map((option) => (
          <button key={option} type="button" role="radio" aria-checked={value === option} className={`create-chip${value === option ? ' on' : ''}`} onClick={() => onChange(option)}>{option}</button>
        ))}
      </div>
    </fieldset>
  );
}

// What the release date means, in plain words, under the date field.
export function ReleaseNote({ releaseDate }) {
  const note = releaseNote(releaseDate);
  return <p className={`create-note ${note.tone}`} role="status">{note.text}</p>;
}

// The movie as customers will see it, and where it will appear, before anything is saved.
export function CustomerPreview({ draft }) {
  const [failed, setFailed] = useState(false);
  const link = draft.posterUrl.trim();
  useEffect(() => { setFailed(false); }, [link]);
  const outcome = predictOutcome({ releaseDate: draft.releaseDate, bookable: 0 });
  const genres = splitGenres(draft.genre).join(', ');
  const line = [draft.rating, genres, Number(draft.duration) > 0 ? durationText(draft.duration) : ''].filter(Boolean).join(' · ');
  return (
    <aside className="create-preview" aria-label="What customers will see">
      <span className="create-preview-label">What customers will see</span>
      <div className="create-preview-card">
        <div className="create-preview-poster">
          {link && !failed ? <img src={link} alt="" onError={() => setFailed(true)} /> : <span>{failed ? "We couldn't load that image" : 'Poster preview'}</span>}
          <em className={`create-preview-tag ${outcome.tone}`}>{outcome.label}</em>
        </div>
        <div className="create-preview-body">
          <b>{draft.title.trim() || 'Movie title'}</b>
          <small>{line || 'Rating · genre · length'}</small>
          <small>{outcome.line}</small>
        </div>
      </div>
      <ul className="create-where">
        {outcome.where.map(([name, yes, note]) => <li key={name}><span>{name}</span><span className={yes ? 'yes' : 'no'}>{yes ? 'Yes' : 'No'}{note ? ` · ${note}` : ''}</span></li>)}
      </ul>
    </aside>
  );
}
