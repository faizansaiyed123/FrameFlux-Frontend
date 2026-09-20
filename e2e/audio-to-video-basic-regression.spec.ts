import { test, expect } from '@playwright/test';
import { API, createUser, expectBlob, uploadMedia } from './qa-helpers';

test('Audio → Video: create video from an audio file', async ({ request }) => {
  const auth = await createUser(request, 'audio-to-video-basic');
  const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

  const response = await request.post(API + '/audio/' + audio.id + '/to-video', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      background_color: '#202020',
      output_format: 'mp4',
      resolution: '320x240',
      fps: 24,
      duration: 1,
    },
  });

  await expectBlob(response, 'video/');
});

test('Audio → Video: add background image', async ({ request }) => {
  const auth = await createUser(request, 'audio-to-video-background-image');
  const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
  const image = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.png');

  const response = await request.post(API + '/audio/' + audio.id + '/to-video', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      background_image: image.stored_filename,
      output_format: 'mp4',
      resolution: '320x240',
      fps: 24,
      duration: 1,
    },
  });

  await expectBlob(response, 'video/');
});

test('Audio → Video: add background color', async ({ request }) => {
  const auth = await createUser(request, 'audio-to-video-background-color');
  const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

  const response = await request.post(API + '/audio/' + audio.id + '/to-video', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      background_color: '#ff0000',
      output_format: 'mp4',
      resolution: '320x240',
      fps: 24,
      duration: 1,
    },
  });

  await expectBlob(response, 'video/');
});
test('Audio → Video: add multiple images', async ({ request }) => {
  const { execFileSync } = await import('node:child_process');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');

  const auth = await createUser(request, 'audio-to-video-multiple-images');
  const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');
  const red = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.png');

  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'color=c=green:s=320x240',
    '-frames:v', '1', 'e2e/fixtures/sample2.png',
  ]);
  const green = await uploadMedia(request, auth.token, 'e2e/fixtures/sample2.png');

  const response = await request.post(API + '/audio/' + audio.id + '/to-video', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      background_images: [red.stored_filename, green.stored_filename],
      output_format: 'mp4',
      resolution: '320x240',
      fps: 24,
      duration: 2,
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.body();
  const output = path.join(os.tmpdir(), 'frameflux-audio-to-video-multiple-images.mp4');
  fs.writeFileSync(output, body);

  const frame = (seconds: string) => Buffer.from(execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-ss', seconds, '-i', output,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
  ]));

  const early = frame('0.25');
  const late = frame('1.25');
  const mean = (buf: Buffer, channel: number) => {
    let total = 0;
    for (let i = channel; i < buf.length; i += 3) total += buf[i];
    return total / (buf.length / 3);
  };

  expect(mean(early, 0)).toBeGreaterThan(mean(early, 1) + 40);
  expect(mean(late, 1)).toBeGreaterThan(mean(late, 0) + 40);
});
test('Audio → Video: add title', async ({ request }) => {
  const auth = await createUser(request, 'audio-to-video-title');
  const audio = await uploadMedia(request, auth.token, 'e2e/fixtures/sample.mp3');

  const response = await request.post(API + '/audio/' + audio.id + '/to-video', {
    headers: { Authorization: 'Bearer ' + auth.token },
    data: {
      background_color: '#202020',
      title: 'FrameFlux QA Title',
      output_format: 'mp4',
      resolution: '320x240',
      fps: 24,
      duration: 1,
    },
  });

  await expectBlob(response, 'video/');
});
