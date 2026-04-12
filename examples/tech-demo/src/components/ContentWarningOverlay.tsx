interface ContentWarningOverlayProps {
  sceneId: string;
  tags: string[];
  onContinue: () => void;
  onBack: () => void;
}

export function ContentWarningOverlay({ sceneId, tags, onContinue, onBack }: ContentWarningOverlayProps) {
  return (
    <div className="content-warning" role="alertdialog" aria-label="Content Warning">
      <div className="content-warning__card">
        <div className="content-warning__icon" aria-hidden="true">/!\</div>
        <h2 className="content-warning__title">Content Warning</h2>
        <div className="content-warning__tags">
          {tags.map((tag) => (
            <span key={tag} className="content-warning__tag">{tag}</span>
          ))}
        </div>
        <p className="content-warning__text">
          The following scene contains content that some viewers may find distressing.
          You can continue or go back.
        </p>
        <div className="content-warning__actions">
          <button className="content-warning__btn content-warning__btn--back" onClick={onBack}>
            Go Back
          </button>
          <button className="content-warning__btn content-warning__btn--continue" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
