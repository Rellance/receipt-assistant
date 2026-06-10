import { useRef, useState } from 'react';
import { uploadReceipt } from '../api/receipts';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function FileUploader({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function processFile(file) {
    setError(null);
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Vain kuvatiedostot: JPEG, PNG, WebP');
      return;
    }

    setIsUploading(true);
    try {
      const receipt = await uploadReceipt(file);
      onUploadSuccess(receipt);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div
        className={`dropzone ${isDragging ? 'dropzone--active' : ''} ${
          isUploading ? 'dropzone--busy' : ''
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          processFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        {/* Pure SVG icon — renders consistently everywhere, unlike emoji */}
        <svg className="dropzone__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 16V4m0 0L7 9m5-5l5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>

        {isUploading ? (
          <p className="dropzone__status">
            <span className="spinner" aria-hidden="true" />
            Tunnistetaan kuittia…
          </p>
        ) : (
          <>
            <p className="dropzone__title">Vedä kuitin kuva tähän</p>
            <p className="dropzone__hint">tai napsauta valitaksesi tiedoston · JPEG, PNG, WebP</p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          hidden
          onChange={(e) => {
            processFile(e.target.files[0]);
            e.target.value = '';
          }}
        />
      </div>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
}