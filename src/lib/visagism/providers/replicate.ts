import fs from 'fs';
import path from 'path';

function getReplicateToken(): string {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
  try {
    const envPaths = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), '.env.local'),
      '/app/.env',
      '/data/coolify/applications/7ho00pvb569n5m3jgee0fnsi/.env',
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        const match = content.match(/^REPLICATE_API_TOKEN=(.+)$/m);
        if (match) {
          let val = match[1].trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (val) return val;
        }
      }
    }
  } catch (e) {}
  return '';
}

export interface GeneratePreviewParams {
  clientPhotoBuffer: Buffer;
  clientPhotoMimeType: string;
  targetHaircutImageUrl: string;
}

export async function generateClientVisualPreview({
  clientPhotoBuffer,
  clientPhotoMimeType,
  targetHaircutImageUrl,
}: GeneratePreviewParams): Promise<string | null> {
  const token = getReplicateToken();
  if (!token) {
    console.warn('REPLICATE_API_TOKEN não configurado.');
    return null;
  }

  try {
    const base64Photo = `data:${clientPhotoMimeType || 'image/jpeg'};base64,${clientPhotoBuffer.toString('base64')}`;

    let res: Response | null = null;
    let retries = 0;

    // Retry com backoff se houver concorrência (429)
    while (retries < 4) {
      res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'wait',
        },
        body: JSON.stringify({
          version: '9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d',
          input: {
            target_image: targetHaircutImageUrl,
            swap_image: base64Photo,
          },
        }),
      });

      if (res.status === 429) {
        retries++;
        await new Promise((r) => setTimeout(r, 2000 * retries));
        continue;
      }
      break;
    }

    if (!res || !res.ok) {
      const errBody = res ? await res.text() : 'No response';
      console.warn('Replicate API error status:', res?.status, errBody);
      return null;
    }

    let data = await res.json();

    // Se a API ainda estiver em processamento (caso passe de 60s)
    let attempts = 0;
    while (data.status !== 'succeeded' && data.status !== 'failed' && attempts < 15) {
      if (!data.urls?.get) break;
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(data.urls.get, {
        headers: { Authorization: `Bearer ${token}` },
      });
      data = await pollRes.json();
      attempts++;
    }

    if (data.status === 'succeeded' && data.output) {
      return typeof data.output === 'string' ? data.output : data.output[0] || null;
    }

    console.warn('Replicate prediction did not succeed:', data.status, data.error);
    return null;
  } catch (err) {
    console.error('Erro ao gerar preview com Replicate:', err);
    return null;
  }
}
