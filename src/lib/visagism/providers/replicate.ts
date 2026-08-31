// BarberFlow - Replicate Face Inpainting & Swap Provider

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || '';

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
  const token = process.env.REPLICATE_API_TOKEN || REPLICATE_API_TOKEN;
  if (!token) {
    console.warn('REPLICATE_API_TOKEN não configurado.');
    return null;
  }

  try {
    const base64Photo = `data:${clientPhotoMimeType || 'image/jpeg'};base64,${clientPhotoBuffer.toString('base64')}`;

    const res = await fetch('https://api.replicate.com/v1/predictions', {
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

    if (!res.ok) {
      const errBody = await res.text();
      console.warn('Replicate API error status:', res.status, errBody);
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
