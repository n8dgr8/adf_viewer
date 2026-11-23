import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Textarea,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  textarea: {
    width: '100%',
    minHeight: '240px',
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontSize: '12px',
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    marginTop: tokens.spacingVerticalXS,
  },
});

export interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportText: (rawText: string) => number;
}

const EXAMPLE_SNIPPET = `{
  "id": "b19204c2-88a1-49d0-912c-334910ab1280",
  "channel_id": 1,
  "start_time": "2026-11-12T16:48:59.687060Z",
  "end_time": "2026-11-12T16:49:01.087023Z",
  "duration": 1.399,
  "classes": [
    {
      "type": "Car",
      "score": 0.8378,
      "colors": [
        { "name": "gray", "score": 0.5811 },
        { "name": "blue", "score": 0.2711 }
      ]
    }
  ],
  "path": [
    { "timestamp": "2026-11-12T16:48:59.687060Z", "bounding_box": { "bottom": 0.2422, "left": 0.8098, "right": 0.8473, "top": 0.2141 } },
    { "timestamp": "2026-11-12T16:49:00.387040Z", "bounding_box": { "bottom": 0.2646, "left": 0.8976, "right": 0.9446, "top": 0.2259 } },
    { "timestamp": "2026-11-12T16:49:01.087023Z", "bounding_box": { "bottom": 0.2948, "left": 0.9935, "right": 0.9990, "top": 0.2550 } }
  ]
}`;

export const ImportModal: React.FC<ImportModalProps> = ({
  open,
  onClose,
  onImportText,
}) => {
  const styles = useStyles();
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const count = onImportText(text);
    if (count === 0) {
      setError(
        'Could not parse any valid Object Track messages. Paste a JSON object, JSON array, or JSONL lines.'
      );
      return;
    }
    setError(null);
    setText('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface style={{ maxWidth: '680px', width: '92vw' }}>
        <DialogBody>
          <DialogTitle>Paste ADF Object Track Payload (JSON / JSONL)</DialogTitle>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Text size={200}>
              Paste a single <code>com.axis.scene.object_track.v1</code> JSON message, a JSON array, or
              newline-delimited <code>.jsonl</code> records.
            </Text>
            <Textarea
              className={styles.textarea}
              placeholder={EXAMPLE_SNIPPET}
              value={text}
              onChange={(_, d) => {
                setText(d.value);
                if (error) setError(null);
              }}
            />
            {error && <Text className={styles.errorText}>{error}</Text>}
          </DialogContent>
          <DialogActions>
            <Button
              appearance="subtle"
              onClick={() => setText(EXAMPLE_SNIPPET)}
            >
              Fill Sample Payload
            </Button>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleSubmit} disabled={!text.trim()}>
              Import Messages
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
