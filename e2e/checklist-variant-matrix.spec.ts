import { test, expect } from '@playwright/test';
import { API, createUser, expectBlob, uploadMedia, waitForMedia } from './qa-helpers';

test.describe.configure({ timeout: 240_000 });

async function checkAll(items: string[], run: (item: string) => Promise<void>) {
  const failures: string[] = [];
  for (const item of items) {
    try {
      await run(item);
    } catch (err) {
      failures.push(item + ': ' + (err instanceof Error ? err.message : String(err)));
    }
  }
  expect(failures, failures.join('\n')).toEqual([]);
}

test.describe('13 Exhaustive declared-option execution', () => {
  test('video output formats: each declared format is attempted independently', async ({ request }) => {
    const auth = await createUser(request, 'all-video-formats');
    await checkAll(['mp4','webm','mkv','mov','avi','flv','mpeg','ts','m4v','3gp'], async (format) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const response = await request.post(API + '/media/' + media.id + '/convert', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: { format, width: 160, height: 120, fps: 24, quality: 5, video_codec: 'h264', audio_codec: 'aac' },
      });
      expect(response.ok(), format + ': ' + await response.text()).toBeTruthy();
      const status = await waitForMedia(request, auth.token, media.id, 30_000);
      expect(status.status, format + ': ' + JSON.stringify(status)).toBe('completed');
    });
  });

  test('video resolution presets: all 144p through 2160p values are accepted', async ({ request }) => {
    const auth = await createUser(request, 'all-video-resolutions');
    await checkAll([
      '144p','240p','360p','480p','720p','1080p','1440p','2160p',
    ], async (resolution) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const response = await request.post(API + '/media/' + media.id + '/convert', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: { format: 'mp4', resolution, width: 160, height: 120, fps: 24, quality: 5, video_codec: 'h264', audio_codec: 'aac' },
      });
      expect(response.ok(), resolution + ': ' + await response.text()).toBeTruthy();
    });
  });

  test('video FPS presets: every declared FPS is accepted', async ({ request }) => {
    const auth = await createUser(request, 'all-video-fps');
    await checkAll(['24','25','30','50','60'], async (fpsText) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const response = await request.post(API + '/media/' + media.id + '/convert', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: { format: 'mp4', width: 160, height: 120, fps: Number(fpsText), quality: 5, video_codec: 'h264', audio_codec: 'aac' },
      });
      expect(response.ok(), fpsText + ': ' + await response.text()).toBeTruthy();
    });
  });

  test('video codecs and aspect ratios: every declared value is accepted', async ({ request }) => {
    const auth = await createUser(request, 'all-video-settings');
    await checkAll(['h264','h265','vp8','vp9','av1'], async (codec) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const response = await request.post(API + '/media/' + media.id + '/convert', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: { format: 'mp4', width: 160, height: 120, fps: 24, quality: 5, video_codec: codec, audio_codec: 'aac' },
      });
      expect(response.ok(), codec + ': ' + await response.text()).toBeTruthy();
    });
    await checkAll(['16:9','9:16','4:3','1:1'], async (aspect_ratio) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const response = await request.post(API + '/media/' + media.id + '/convert', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: { format: 'mp4', width: 160, height: 120, fps: 24, quality: 5, video_codec: 'h264', audio_codec: 'aac', aspect_ratio },
      });
      expect(response.ok(), aspect_ratio + ': ' + await response.text()).toBeTruthy();
    });
  });

  test('image output formats: JPG/JPEG/PNG/WebP/GIF/BMP/TIFF are all attempted', async ({ request }) => {
    const auth = await createUser(request, 'all-image-formats');
    await checkAll(['jpg','jpeg','png','webp','gif','bmp','tiff'], async (format) => {
      const image = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.png');
      const response = await request.post(API + '/images/' + image.id + '/convert', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: { format, width: 160, height: 120, quality: 80 },
      });
      await expectBlob(response, 'image/');
    });
  });

  test('audio extraction formats and channel modes: every declared format plus mono/stereo', async ({ request }) => {
    const auth = await createUser(request, 'all-audio-extract');
    await checkAll(['mp3','wav','aac','flac','ogg','m4a','opus','aiff'], async (format) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      await expectBlob(await request.get(API + '/audio/' + media.id + '/extract?format=' + format + '&bitrate=192k&sample_rate=' + (format === 'opus' ? '48000' : '44100') + '&channels=2', {
        headers: { Authorization: 'Bearer ' + auth.token },
      }), 'audio/');
    });
    await checkAll(['1','2'], async (channels) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      await expectBlob(await request.get(API + '/audio/' + media.id + '/extract?format=mp3&bitrate=192k&sample_rate=44100&channels=' + channels, {
        headers: { Authorization: 'Bearer ' + auth.token },
      }), 'audio/');
    });
  });

  test('audio conversion formats: MP3/WAV/AAC/FLAC/OGG/M4A/OPUS/AIFF/WMA are all attempted', async ({ request }) => {
    const auth = await createUser(request, 'all-audio-convert');
    await checkAll(['mp3','wav','aac','flac','ogg','m4a','opus','aiff','wma'], async (format) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
      const response = await request.post(API + '/audio/' + media.id + '/convert', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: { format, bitrate: '192k', sample_rate: format === 'opus' ? 48000 : 44100, channels: 2, quality: 'medium' },
      });
      expect(response.ok(), format + ': ' + await response.text()).toBeTruthy();
      await expectBlob(response, 'audio/');
    });
  });

  test('audio edit operations: every declared operation is independently attempted', async ({ request }) => {
    const auth = await createUser(request, 'all-audio-edit');
    await checkAll(['trim','cut','split','merge','speed','normalize','fade','silence'], async (operation) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
      const data: any =
        ['trim','cut','split'].includes(operation) ? { operation, start: 0.2, end: 1.2 } :
        operation === 'merge' ? { operation, target_files: [media.stored_filename] } :
        operation === 'speed' ? { operation, speed: 1.25 } :
        operation === 'fade' ? { operation, fade_in: 0.25, fade_out: 0.25 } :
        operation === 'silence' ? { operation, silence_duration: 0.5 } :
        { operation };
      const response = await request.post(API + '/audio/' + media.id + '/edit', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data,
      });
      expect(response.ok(), operation + ': ' + await response.text()).toBeTruthy();
    });
  });

  test('subtitle formats: SRT, VTT and ASS are each uploaded and applied', async ({ request }) => {
    const auth = await createUser(request, 'all-subtitle-formats');
    await checkAll(['srt','vtt','ass'], async (ext) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const response = await request.post(API + '/subtitles/upload', {
        headers: { Authorization: 'Bearer ' + auth.token },
        multipart: {
          file: {
            name: 'sample.' + ext,
            mimeType: ext === 'vtt' ? 'text/vtt' : ext === 'srt' ? 'application/x-subrip' : 'text/plain',
            buffer: Buffer.from(ext === 'srt'
              ? '1\n00:00:00,000 --> 00:00:01,000\nFrameFlux'
              : ext === 'vtt'
                ? 'WEBVTT\n\n00:00.000 --> 00:01.000\nFrameFlux'
                : '[Script Info]\n\n[V4+ Styles]\n\n[Events]\nDialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,FrameFlux'),
          },
        },
      });
      expect(response.ok(), ext + ': ' + await response.text()).toBeTruthy();
      const subtitlePath = (await response.json()).filename;
      const burn = await request.post(API + '/subtitles/' + media.id + '/burn?subtitle_path=' + encodeURIComponent(subtitlePath) + '&font_size=24&font_color=white&position=bottom', {
        headers: { Authorization: 'Bearer ' + auth.token },
      });
      expect(burn.ok(), ext + ' burn: ' + await burn.text()).toBeTruthy();
    });
  });

  test('thumbnail output formats: JPG, PNG and WebP are independently attempted', async ({ request }) => {
    const auth = await createUser(request, 'all-thumbnail-formats');
    await checkAll(['jpg','png','webp'], async (fmt) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const response = await request.get(API + '/thumbnails/' + media.id + '?timestamp=0.5&width=160&height=120&fmt=' + fmt, {
        headers: { Authorization: 'Bearer ' + auth.token },
      });
      await expectBlob(response, 'image/');
    });
  });

  test('GIF FPS presets and quality presets: every declared value is exercised', async ({ request }) => {
    const auth = await createUser(request, 'all-gif-settings');
    await checkAll(['10','12','15','20','24','30'], async (fps) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const response = await request.post(API + '/gif/' + media.id + '/generate?start=0&duration=1&width=160&fps=' + fps + '&quality=10', {
        headers: { Authorization: 'Bearer ' + auth.token },
      });
      await expectBlob(response, 'image/gif');
    });
    await checkAll(['5','10','15','20'], async (quality) => {
      const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
      const response = await request.post(API + '/gif/' + media.id + '/generate?start=0&duration=1&width=160&fps=10&quality=' + quality, {
        headers: { Authorization: 'Bearer ' + auth.token },
      });
      await expectBlob(response, 'image/gif');
    });
  });

  test('preview variants: video, GIF and thumbnail outputs are all exercised', async ({ request }) => {
    const auth = await createUser(request, 'all-preview-variants');
    const media = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    await expectBlob(await request.get(API + '/preview/' + media.id + '/video?duration=1&start=0&width=160&fps=10', {
      headers: { Authorization: 'Bearer ' + auth.token },
    }), 'video/');
    await expectBlob(await request.get(API + '/preview/' + media.id + '/gif?duration=1&start=0&width=160&fps=10&quality=10', {
      headers: { Authorization: 'Bearer ' + auth.token },
    }), 'image/gif');
    await expectBlob(await request.get(API + '/preview/' + media.id + '/thumbnail?timestamp=0.5&width=160&height=120&fmt=webp', {
      headers: { Authorization: 'Bearer ' + auth.token },
    }), 'image/');
  });

  test('audio/video sync control variants: replace, mix, mute/volume and offsets are all sent', async ({ request }) => {
    const auth = await createUser(request, 'all-sync-controls');
    const video = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp4');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    await checkAll(['replace','mix'], async (mode) => {
      const response = await request.post(API + '/audio/' + video.id + '/sync-audio', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data: {
          audio_path: audio.stored_filename,
          audio_offset: mode === 'mix' ? 0.125 : -0.250,
          video_duration: 2,
          audio_duration: 2,
          volume: mode === 'mix' ? 0.5 : 1,
          mix: mode === 'mix',
          mix_volume: 0.5,
          output_format: 'mp4',
        },
      });
      expect(response.ok(), mode + ': ' + await response.text()).toBeTruthy();
    });
    const volume = await request.post(API + '/audio/' + video.id + '/volume?volume=0.75', {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    expect(volume.ok(), await volume.text()).toBeTruthy();
  });

  test('multiple background/media controls: image/color/background-watermark variants are sent', async ({ request }) => {
    const auth = await createUser(request, 'all-a2v-controls');
    const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
    const image = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.png');

    for (const data of [
      { background_image: image.stored_filename, output_format: 'mp4' },
      { background_color: '#222222', output_format: 'mp4' },
      { watermark: image.stored_filename, output_format: 'mp4' },
      { title: 'Title', artist: 'Artist', text: 'Custom', show_waveform: true, visualizer_style: 'bars', resolution: '320x240', fps: 24, aspect_ratio: '4:3', duration: 1, output_format: 'mp4' },
      { visualizer_style: 'wave', output_format: 'webm' },
      { visualizer_style: 'circle', output_format: 'mp4' },
    ]) {
      const response = await request.post(API + '/audio/' + audio.id + '/to-video', {
        headers: { Authorization: 'Bearer ' + auth.token },
        data,
      });
      await expectBlob(response, 'video/');
    }
  });
});