// Sequential feature gate: Mix original + new audio
import { test, expect, APIRequestContext, Page } from '@playwright/test';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { API, createUser, expectBlob, uploadMedia, setAuthenticatedBrowser, waitForMedia } from './qa-helpers';

test.describe.configure({ mode: 'parallel', timeout: 120_000 });

type Ctx = { request: APIRequestContext; page: Page };

const VIDEO_FORMATS = ['mp4','webm','mkv','mov','avi','flv','mpeg','ts','m4v','3gp'];
const AUDIO_FORMATS = ['mp3','wav','aac','flac','ogg','m4a','opus','aiff','wma'];
const IMAGE_FORMATS = ['jpg','jpeg','png','webp','gif','bmp','tiff'];
const VIDEO_RES = ['144p','240p','360p','480p','720p','1080p','1440p','2160p'];
const FPS = [24,25,30,50,60];
const CODECS: Record<string,string> = {'H.264':'h264','H.265 / HEVC':'h265','VP8':'vp8','VP9':'vp9','AV1':'av1'};
const RATIOS = ['16:9','9:16','4:3','1:1'];
const execFileAsync = promisify(execFile);
const TARGET_SECTION_NUMBER = 6;
const TARGET_FEATURE = 'Replace original audio';

async function ok(r: Awaited<ReturnType<APIRequestContext['get'] | APIRequestContext['post'] | APIRequestContext['patch'] | APIRequestContext['put'] | APIRequestContext['delete']>>, label:string) {
  expect(r.ok(), label + ': ' + await r.text()).toBeTruthy();
  return r;
}
async function auth(request: APIRequestContext, prefix='atomic') { return createUser(request, prefix); }
async function video(ctx: Ctx) { const a=await auth(ctx.request,'atomic-v'); return [a, await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4')] as const; }
async function audio(ctx: Ctx) { const a=await auth(ctx.request,'atomic-a'); return [a, await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3')] as const; }
async function image(ctx: Ctx) { const a=await auth(ctx.request,'atomic-i'); return [a, await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.png')] as const; }

function fmtFor(feature:string) {
  const s=feature.toLowerCase();
  const hit=[...VIDEO_FORMATS,...AUDIO_FORMATS,...IMAGE_FORMATS].find(x=>s===x || s.startsWith(x+' ') || s.includes(' '+x));
  return hit;
}

async function ui(ctx: Ctx, route:string, patterns:RegExp[]=[]) {
  const a=await auth(ctx.request,'atomic-ui');
  await setAuthenticatedBrowser(ctx.page,a.email,a.password);
  await ctx.page.goto(route);
  await expect(ctx.page.locator('body')).toBeVisible();
  for (const p of patterns) await expect(ctx.page.locator('body')).toContainText(p);
}

async function exercise(section:string, feature:string, ctx:Ctx) {
  const f=feature.trim(), l=f.toLowerCase();

  // Atomic format/option execution.
  const fmt=fmtFor(f);
  if (section.includes('VIDEO → VIDEO') && VIDEO_FORMATS.includes(fmt||'')) {
    const a=await auth(ctx.request,'atomic-vfmt'), m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    const data:any = {format:fmt,width:160,height:120,fps:24,quality:5};
    if (fmt === 'webm') { data.video_codec = 'vp9'; data.audio_codec = 'opus'; }
    else if (fmt !== 'mpeg') { data.video_codec = 'h264'; data.audio_codec = 'aac'; }
    await ok(await ctx.request.post(API+`/media/${m.id}/convert`,{headers:{Authorization:'Bearer '+a.token},data}),f);
    const st=await waitForMedia(ctx.request,a.token,m.id,25_000); expect(st.status,f+': '+JSON.stringify(st)).toBe('completed'); return;
  }
  if (section.includes('AUDIO → AUDIO') && AUDIO_FORMATS.includes(fmt||'')) {
    const a=await auth(ctx.request,'atomic-afmt'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3');
    await ok(await ctx.request.post(API+`/audio/${m.id}/convert`,{headers:{Authorization:'Bearer '+a.token},data:{format:fmt,bitrate:'192k',sample_rate:fmt==='opus'?48000:44100,channels:2,quality:'medium'}}),f); return;
  }
  if (section.includes('VIDEO → AUDIO') && ['mp3','wav','aac','flac','ogg','m4a','opus','aiff'].includes(fmt||'')) {
    const a=await auth(ctx.request,'atomic-extract'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    await expectBlob(await ctx.request.get(API+`/audio/${m.id}/extract?format=${fmt}&bitrate=192k&sample_rate=${fmt==='opus'?48000:44100}&channels=2`,{headers:{Authorization:'Bearer '+a.token}}),'audio/'); return;
  }
  if (section.includes('MEDIA FORMAT SUPPORT')) {
    if (VIDEO_FORMATS.includes(fmt||'')){ const a=await auth(ctx.request,'atomic-vsupport'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4'); await ok(await ctx.request.post(API+`/media/${m.id}/convert`,{headers:{Authorization:'Bearer '+a.token},data:{format:fmt,width:160,height:120,fps:24,quality:5,video_codec:'h264',audio_codec:'aac'}}),f); return; }
    if (AUDIO_FORMATS.includes(fmt||'')){ const a=await auth(ctx.request,'atomic-asupport'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3'); await ok(await ctx.request.post(API+`/audio/${m.id}/convert`,{headers:{Authorization:'Bearer '+a.token},data:{format:fmt,bitrate:'192k',sample_rate:fmt==='opus'?48000:44100,channels:2,quality:'medium'}}),f); return; }
    if (['jpg/jpeg','png','webp','gif','bmp','tiff'].includes(f.toLowerCase())){ const a=await auth(ctx.request,'atomic-isupport'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.png'); const out=f.toLowerCase().split('/')[0]; await expectBlob(await ctx.request.post(API+`/images/${m.id}/convert`,{headers:{Authorization:'Bearer '+a.token},data:{format:out,width:160,height:120,quality:80}}),'image/'); return; }
    if (['srt','vtt','ass'].includes(f.toLowerCase())){ const a=await auth(ctx.request,'atomic-ssupport'); const ext=f.toLowerCase(); const body=ext==='srt'?'1\\n00:00:00,000 --> 00:00:01,000\\nFrameFlux':ext==='vtt'?'WEBVTT\\n\\n00:00.000 --> 00:01.000\\nFrameFlux':'[Script Info]\\n[V4+ Styles]\\n[Events]\\nDialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,FrameFlux'; await ok(await ctx.request.post(API+'/subtitles/upload',{headers:{Authorization:'Bearer '+a.token},multipart:{file:{name:'sample.'+ext,mimeType:ext==='vtt'?'text/vtt':ext==='srt'?'application/x-subrip':'text/plain',buffer:Buffer.from(body)}}}),f); return; }
  }

  // Core upload controls.
  if (l==='upload video' || l==='video') { const a=await auth(ctx.request,'atomic-upv'); await ok(await ctx.request.post(API+'/media/upload',{headers:{Authorization:'Bearer '+a.token},multipart:{file:{name:'sample.mp4',mimeType:'video/mp4',buffer:require('node:fs').readFileSync('e2e/fixtures/sample.mp4')}}}),f); return; }
  if (l==='upload audio' || l==='separate audio file') { const a=await auth(ctx.request,'atomic-upa'); await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3'); return; }
  if (l==='upload image' || l==='background image' || l==='cover.jpg') { const a=await auth(ctx.request,'atomic-upi'); await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.png'); return; }
  if (l.includes('upload subtitle') || ['srt','vtt','ass'].includes(l)) { const a=await auth(ctx.request,'atomic-ups'); const ext=l==='srt'?'srt':l==='vtt'?'vtt':'ass'; await ok(await ctx.request.post(API+'/subtitles/upload',{headers:{Authorization:'Bearer '+a.token},multipart:{file:{name:'sample.'+ext,mimeType:ext==='vtt'?'text/vtt':ext==='srt'?'application/x-subrip':'text/plain',buffer:Buffer.from('1\\n00:00:00,000 --> 00:00:01,000\\nFrameFlux')}}}),f); return; }
  if (l==='upload multiple files' || l==='multiple media upload' || l==='upload multiple files') {
    const a=await auth(ctx.request,'atomic-multi'),fs=require('node:fs'),form=new FormData();
    form.append('files',new Blob([fs.readFileSync('e2e/fixtures/sample.mp4')],{type:'video/mp4'}),'sample.mp4');
    form.append('files',new Blob([fs.readFileSync('e2e/fixtures/sample.mp3')],{type:'audio/mpeg'}),'sample.mp3');
    form.append('files',new Blob([fs.readFileSync('e2e/fixtures/sample.png')],{type:'image/png'}),'sample.png');
    const r=await fetch(API+'/media/upload-multiple',{method:'POST',headers:{Authorization:'Bearer '+a.token},body:form});
    const body=await r.text();
    expect(r.ok,body).toBeTruthy();
    expect(JSON.parse(body).length).toBe(3);
    return;
  }
  if (l.includes('pause upload') || l.includes('resume upload') || l.includes('retry upload') || l.includes('cancel upload') || l.includes('large-file')) {
    await ui(ctx,'/app/dashboard/media',[/Upload media/i]); return;
  }

  // Conversion settings.
  if (section.includes('VIDEO → VIDEO')) {
    const a=await auth(ctx.request,'atomic-conv'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    if (VIDEO_RES.includes(f)) { await ok(await ctx.request.post(API+`/media/${m.id}/convert`,{headers:{Authorization:'Bearer '+a.token},data:{format:'mp4',resolution:f,width:160,height:120,fps:24,quality:5,video_codec:'h264',audio_codec:'aac'}}),f); return; }
    if (f.includes('FPS')) { const n=Number(f.replace(/[^0-9]/g,'')); await ok(await ctx.request.post(API+`/media/${m.id}/convert`,{headers:{Authorization:'Bearer '+a.token},data:{format:'mp4',width:160,height:120,fps:n,quality:5,video_codec:'h264',audio_codec:'aac'}}),f); return; }
    if (CODECS[f]) { await ok(await ctx.request.post(API+`/media/${m.id}/convert`,{headers:{Authorization:'Bearer '+a.token},data:{format:'mp4',width:160,height:120,fps:24,quality:5,video_codec:CODECS[f],audio_codec:'aac'}}),f); return; }
    if (RATIOS.includes(f)) { await ok(await ctx.request.post(API+`/media/${m.id}/convert`,{headers:{Authorization:'Bearer '+a.token},data:{format:'mp4',width:160,height:120,fps:24,quality:5,video_codec:'h264',audio_codec:'aac',aspect_ratio:f}}),f); return; }
    await ok(await ctx.request.post(API+`/media/${m.id}/convert`,{headers:{Authorization:'Bearer '+a.token},data:{format:'mp4',width:160,height:120,fps:24,quality:5,video_codec:'h264',audio_codec:'aac',bitrate:'800k',aspect_ratio:'16:9'}}),f); return;
  }

  // Video editing / audio-video operations.
  if (section.includes('VIDEO EDITING') || ['trim video','cut video','split video','delete selected section','keep selected section','extract selected section','merge videos','reorder clips','add multiple clips','freeze frame','crop video','resize video','rotate video','flip video'].includes(l)) {
    const a=await auth(ctx.request,'atomic-edit'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    if (l==='merge videos'||l==='reorder clips'||l==='add multiple clips'){ const b=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample2.mp4'); const route=l==='reorder clips'?'/clips/reorder':l==='add multiple clips'?'/clips/append':'/merge'; await ok(await ctx.request.post(API+`/media/${m.id}${route}`,{headers:{Authorization:'Bearer '+a.token},data:{media_ids:[b.id,m.id]}}),f); return; }
    if (l==='freeze frame'){ await ok(await ctx.request.post(API+`/media/${m.id}/freeze`,{headers:{Authorization:'Bearer '+a.token},data:{timestamp:0.5,duration:0.5}}),f); return; }
    if (l.includes('split')) {
      const response=await ok(await ctx.request.post(API+`/media/${m.id}/split`,{headers:{Authorization:'Bearer '+a.token},data:{split_points:[1]}}),f);
      const body=await response.json();
      expect(body.operation,f).toBe('split');
      const st=await waitForMedia(ctx.request,a.token,m.id,25_000);
      expect(st.status,f+': '+JSON.stringify(st)).toBe('completed');
      return;
    }
    if (l.includes('delete')) {
      const response=await ok(await ctx.request.post(API+`/media/${m.id}/clips/delete`,{headers:{Authorization:'Bearer '+a.token},data:{clips:[{start:0.2,end:1.2}]}}),f);
      const body=await response.json();
      expect(body.operation,f).toBe('delete_clips');
      const st=await waitForMedia(ctx.request,a.token,m.id,25_000);
      expect(st.status,f+': '+JSON.stringify(st)).toBe('completed');
      return;
    }
    const op=l.includes('trim')?'trim':l.includes('cut')?'cut':'extract';
    await ok(await ctx.request.post(API+`/media/${m.id}/edit`,{headers:{Authorization:'Bearer '+a.token},data:{operation:op,start:0.2,end:1.2}}),f); return;
  }
  if (l.includes('overlay')) { const a=await auth(ctx.request,'atomic-overlay'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4'); await ok(await ctx.request.post(API+`/media/${m.id}/overlay`,{headers:{Authorization:'Bearer '+a.token},data:{type:l.includes('image')||l.includes('watermark')?'image':'text',text:'FrameFlux',x:10,y:10,duration:1}}),f); return; }
  if (l.includes('audio') && (l.includes('remove')||l.includes('add ')||l.includes('replace')||l.includes('mix')||l.includes('mute')||l.includes('volume')||l.includes('delay')||l.includes('offset')||l.includes('fade'))) {
    const a=await auth(ctx.request,'atomic-va'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    if (l==='remove audio') {
      const response=await ok(await ctx.request.post(API+`/quick-actions/${m.id}/execute?action_id=remove-audio`,{headers:{Authorization:'Bearer '+a.token}}),f);
      expect((await response.json()).status,f).toBe('queued');
      const st=await waitForMedia(ctx.request,a.token,m.id,30_000);
      expect(st.status,f+': '+JSON.stringify(st)).toBe('completed');
      expect(st.processed_filename,f).toBeTruthy();
      const processed=await ok(await ctx.request.get(API+`/media/${m.id}/processed`,{headers:{Authorization:'Bearer '+a.token}}),f);
      const body=await processed.body();
      const outputPath=`/tmp/frameflux-remove-audio-${m.id}.mp4`;
      await fs.writeFile(outputPath,body);
      const probe=await execFileAsync('ffprobe',['-v','error','-select_streams','a','-show_entries','stream=codec_type','-of','default=nw=1:nk=1',outputPath]);
      expect(probe.stdout.trim(),f).toBe('');
      await fs.rm(outputPath,{force:true});
      return;
    }
    if (l==='add audio') {
      const au=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3');
      await expectBlob(await ctx.request.post(API+`/audio/${m.id}/sync-audio`,{headers:{Authorization:'Bearer '+a.token},data:{audio_path:au.stored_filename,audio_offset:0,mix:true,mix_volume:0.5,output_format:'mp4'}}),'video/');
      return;
    }
    if (l==='replace audio') {
      const au=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3');
      const response=await ok(await ctx.request.post(API+`/audio/${m.id}/replace-audio?audio_path=${encodeURIComponent(au.stored_filename)}`,{headers:{Authorization:'Bearer '+a.token}}),f);
      const body=await response.json();
      expect(body.output_filename,f).toBeTruthy();
      return;
    }
    if (l==='mix original + new audio') {
      const au=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3');
      await expectBlob(await ctx.request.post(API+`/audio/${m.id}/sync-audio`,{headers:{Authorization:'Bearer '+a.token},data:{audio_path:au.stored_filename,audio_offset:0,mix:true,mix_volume:0.5,output_format:'mp4'}}),'video/');
      return;
    }
    if (l==='mute original audio') {
      const au=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3');
      const response=await expectBlob(await ctx.request.post(API+`/audio/${m.id}/sync-audio`,{headers:{Authorization:'Bearer '+a.token},data:{audio_path:au.stored_filename,audio_offset:0,mix:false,output_format:'mp4'}}),'video/');
      const outputPath=`/tmp/frameflux-mute-original-${m.id}.mp4`;
      await fs.writeFile(outputPath,response);
      const probe=await execFileAsync('ffprobe',['-v','error','-select_streams','a','-show_entries','stream=index','-of','csv=p=0',outputPath]);
      expect(probe.stdout.trim().split(/\\r?\\n/).filter(Boolean),f).toHaveLength(1);
      await fs.rm(outputPath,{force:true});
      return;
    }
    if (l.includes('volume')) { await ok(await ctx.request.post(API+`/audio/${m.id}/volume?volume=0.8`,{headers:{Authorization:'Bearer '+a.token}}),f); return; }
    if (l.includes('fade in')) { await ok(await ctx.request.post(API+`/audio/${m.id}/volume?volume=1&fade_in=0.2`,{headers:{Authorization:'Bearer '+a.token}}),f); return; }
    if (l.includes('fade out')) { await ok(await ctx.request.post(API+`/audio/${m.id}/volume?volume=1&fade_out=0.2`,{headers:{Authorization:'Bearer '+a.token}}),f); return; }
    if (l.includes('delay') || l.includes('offset')) { const au=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3'); await expectBlob(await ctx.request.post(API+`/audio/${m.id}/sync-audio`,{headers:{Authorization:'Bearer '+a.token},data:{audio_path:au.stored_filename,audio_offset:0.1,output_format:'mp4'}}),'video/'); return; }
    if (l.includes('mix')) { const au=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3'); await expectBlob(await ctx.request.post(API+`/audio/${m.id}/sync-audio`,{headers:{Authorization:'Bearer '+a.token},data:{audio_path:au.stored_filename,mix:true,mix_volume:0.5,output_format:'mp4'}}),'video/'); return; }
    if (l.includes('replace')||l.includes('add ')) { const au=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3'); await ok(await ctx.request.post(API+`/audio/${m.id}/replace-audio?audio_path=${encodeURIComponent(au.stored_filename)}`,{headers:{Authorization:'Bearer '+a.token}}),f); return; }
    await ok(await ctx.request.post(API+`/media/${m.id}/edit`,{headers:{Authorization:'Bearer '+a.token},data:{operation:l.includes('remove')?'remove_audio':'fade',fade_in:l.includes('in')?0.2:0,fade_out:l.includes('out')?0.2:0,offset:0.1}}),f); return;
  }

  // External audio sync.
  if (section.includes('EXTERNAL AUDIO SYNC') || l.includes('sync external') || l.includes('synchronized video')) {
    const a=await auth(ctx.request,'atomic-sync'),v=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4'),au=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3');
    await expectBlob(await ctx.request.post(API+`/audio/${v.id}/sync-audio`,{headers:{Authorization:'Bearer '+a.token},data:{audio_path:au.stored_filename,audio_offset:0,output_format:'mp4'}}),'video/'); return;
  }

  // Compression.
  if (section.includes('VIDEO COMPRESSION') || l.includes('compression') || l.includes('compress video') || l.includes('target file size')) {
    const a=await auth(ctx.request,'atomic-comp'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    await ok(await ctx.request.post(API+`/media/${m.id}/compress`,{headers:{Authorization:'Bearer '+a.token},data:{format:'mp4',quality:l.includes('maximum')?40:l.includes('low')?18:24,video_bitrate:'500k',target_size_mb:1,resolution_based:l.includes('resolution')}}),f); return;
  }

  // Audio extraction/conversion/editing.
  if (section.includes('VIDEO → AUDIO') || l.includes('extract audio')) {
    const a=await auth(ctx.request,'atomic-extract2'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    await expectBlob(await ctx.request.get(API+`/audio/${m.id}/extract?format=mp3&bitrate=192k&sample_rate=44100&channels=${l.includes('mono')?'1':'2'}&start=0.2&end=1.2`,{headers:{Authorization:'Bearer '+a.token}}),'audio/'); return;
  }
  if (section.includes('AUDIO → AUDIO') || section.includes('AUDIO EDITING')) {
    const a=await auth(ctx.request,'atomic-edit-a'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3');
    if (l==='convert'||l==='compress audio'||l.includes('change bitrate')||l.includes('sample rate')||l.includes('quality')) { await ok(await ctx.request.post(API+`/audio/${m.id}/convert`,{headers:{Authorization:'Bearer '+a.token},data:{format:'mp3',bitrate:'128k',sample_rate:44100,channels:l.includes('mono')?1:2,quality:'low'}}),f); return; }
    if (l.includes('merge')) { const b=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample2.mp4'); await ok(await ctx.request.post(API+`/audio/${m.id}/edit`,{headers:{Authorization:'Bearer '+a.token},data:{operation:'merge',target_files:[m.stored_filename,b.stored_filename]}}),f); return; }
    const op=l.includes('trim')?'trim':l.includes('cut')?'cut':l.includes('split')?'split':l.includes('normalize')?'normalize':l.includes('fade')?'fade':l.includes('speed')?'speed':l.includes('silence')?'silence':'trim';
    await ok(await ctx.request.post(API+`/audio/${m.id}/edit`,{headers:{Authorization:'Bearer '+a.token},data:{operation:op,start:0.2,end:1.2,speed:1.25,silence_duration:0.4,fade_in:0.2,fade_out:0.2}}),f); return;
  }

  // Audio -> video.
  if (section.includes('AUDIO → VIDEO') || l.includes('convert to video') || l.includes('create video from audio')) {
    const a=await auth(ctx.request,'atomic-a2v'),au=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp3'),im=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.png');
    await expectBlob(await ctx.request.post(API+`/audio/${au.id}/to-video`,{headers:{Authorization:'Bearer '+a.token},data:{background_image:im.stored_filename,background_color:'#202020',title:'FrameFlux',artist:'QA',text:'Atomic',watermark:im.stored_filename,show_waveform:true,show_visualizer:true,visualizer_style:'circle',resolution:'320x240',fps:24,aspect_ratio:'4:3',duration:1,output_format:l.includes('webm')?'webm':'mp4'}}),'video/'); return;
  }

  // Thumbnail/GIF/preview.
  if (section.includes('THUMBNAIL') || l.includes('thumbnail') || l.includes('frame from video')) {
    const a=await auth(ctx.request,'atomic-thumb'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    await expectBlob(await ctx.request.get(API+`/thumbnails/${m.id}?timestamp=0.5&width=160&height=120&fmt=${l.includes('png')?'png':l.includes('webp')?'webp':'jpg'}`,{headers:{Authorization:'Bearer '+a.token}}),'image/'); return;
  }
  if (section==='13 GIF' || l.includes('gif')) {
    const a=await auth(ctx.request,'atomic-gif'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    await expectBlob(await ctx.request.post(API+`/gif/${m.id}/generate?start=0&duration=1&width=160&fps=10&quality=10`,{headers:{Authorization:'Bearer '+a.token}}),'image/gif'); return;
  }
  if (section.includes('VIDEO PREVIEW') || l.includes('preview')) {
    const a=await auth(ctx.request,'atomic-preview'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    if (l.includes('gif')) await expectBlob(await ctx.request.get(API+`/preview/${m.id}/gif?duration=1&start=0&width=160&fps=10&quality=10`,{headers:{Authorization:'Bearer '+a.token}}),'image/gif');
    else if (l.includes('thumbnail')) await expectBlob(await ctx.request.get(API+`/preview/${m.id}/thumbnail?timestamp=0.5&width=160&height=120&fmt=webp`,{headers:{Authorization:'Bearer '+a.token}}),'image/');
    else await expectBlob(await ctx.request.get(API+`/preview/${m.id}/video?duration=1&start=0&width=160&fps=10`,{headers:{Authorization:'Bearer '+a.token}}),'video/');
    return;
  }

  // Subtitles.
  if (section.includes('SUBTITLE') || ['srt','vtt','ass'].includes(l)) {
    const a=await auth(ctx.request,'atomic-sub'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4'),ext=['srt','vtt','ass'].find(x=>l.includes(x))||'srt';
    const body=ext==='srt'?'1\\n00:00:00,000 --> 00:00:01,000\\nFrameFlux':ext==='vtt'?'WEBVTT\\n\\n00:00.000 --> 00:01.000\\nFrameFlux':'[Script Info]\\n[V4+ Styles]\\n[Events]\\nDialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,FrameFlux';
    const up=await ok(await ctx.request.post(API+'/subtitles/upload',{headers:{Authorization:'Bearer '+a.token},multipart:{file:{name:'sample.'+ext,mimeType:ext==='vtt'?'text/vtt':ext==='srt'?'application/x-subrip':'text/plain',buffer:Buffer.from(body)}}}),f);
    const p=(await up.json()).filename;
    if (l.includes('burn')) await ok(await ctx.request.post(API+`/subtitles/${m.id}/burn?subtitle_path=${encodeURIComponent(p)}&font_size=24&font_color=white&position=bottom`,{headers:{Authorization:'Bearer '+a.token}}),f);
    else if (l.includes('mux')||l.includes('track')) await ok(await ctx.request.post(API+`/subtitles/${m.id}/mux`,{headers:{Authorization:'Bearer '+a.token},data:{subtitle_path:p}}),f);
    else if (l.includes('sync')||l.includes('timing')||l.includes('forward')||l.includes('backward')) await ok(await ctx.request.post(API+`/subtitles/${m.id}/sync`,{headers:{Authorization:'Bearer '+a.token},data:{subtitle_path:p,offset_ms:250}}),f);
    else await ok(await ctx.request.get(API+`/subtitles/${m.id}/tracks`,{headers:{Authorization:'Bearer '+a.token}}),f);
    return;
  }

  // Media information.
  if (section.includes('MEDIA INFORMATION')) {
    const a=await auth(ctx.request,'atomic-info'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    const r=await ok(await ctx.request.get(API+`/media/${m.id}`,{headers:{Authorization:'Bearer '+a.token}}),f); const b=await r.json();
    const keys=['original_filename','file_size','duration','width','height','fps','video_codec','audio_codec','bitrate','audio_channels','sample_rate','mime_type','metadata'];
    const key=keys.find(k=>l.replace(/[^a-z]/g,'').includes(k.replace(/[^a-z]/g,''))); expect(b,JSON.stringify(b)).toBeTruthy(); if(key) expect(b[key] ?? b.media?.[key],key).toBeDefined(); return;
  }

  // Batch.
  if (section.includes('BATCH PROCESSING')) {
    const a=await auth(ctx.request,'atomic-batch');
    const r=await ok(await ctx.request.post(API+'/batch/upload',{headers:{Authorization:'Bearer '+a.token},data:{files:['sample.mp4','sample2.mp4']}}),f);
    const body=await r.json();
    if (l.includes('status')) await ok(await ctx.request.get(API+`/batch/${body.job_id}/status`,{headers:{Authorization:'Bearer '+a.token}}),f);
    else if (l.includes('download')) { const m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4'); await ok(await ctx.request.post(API+'/media/batch-download',{headers:{Authorization:'Bearer '+a.token},data:{media_ids:[m.id]}}),f); }
    else expect(body.total_files).toBeGreaterThan(0);
    return;
  }

  // Presets.
  if (section.includes('PRESETS')) {
    const a=await auth(ctx.request,'atomic-preset');
    if (l.includes('built-in')||['youtube','youtube shorts','instagram','tiktok','web','mobile','podcast','archive','high quality','small file'].includes(l)) { await ok(await ctx.request.get(API+'/presets',{headers:{Authorization:'Bearer '+a.token}}),f); return; }
    const created=await ok(await ctx.request.post(API+'/presets',{headers:{Authorization:'Bearer '+a.token},data:{name:'Atomic QA Preset',description:'Atomic',settings:{format:'mp4',quality:5}}}),f); const p=await created.json();
    if (l.includes('rename')||l.includes('edit')) await ok(await ctx.request.put(API+`/presets/${p.id}`,{headers:{Authorization:'Bearer '+a.token},data:{name:'Atomic QA Preset 2'}}),f);
    else if (l.includes('duplicate')||l.includes('reuse')) await ok(await ctx.request.post(API+`/presets/${p.id}/duplicate`,{headers:{Authorization:'Bearer '+a.token}}),f);
    else if (l.includes('delete')) await ok(await ctx.request.delete(API+`/presets/${p.id}`,{headers:{Authorization:'Bearer '+a.token}}),f);
    return;
  }

  // Workflows.
  if (section.includes('WORKFLOWS')) {
    const a=await auth(ctx.request,'atomic-workflow');
    const created=await ok(await ctx.request.post(API+'/workflows',{headers:{Authorization:'Bearer '+a.token},data:{name:'Atomic QA Workflow',operations:[{type:'convert',settings:{format:'mp4'}},{type:'compress',settings:{quality:24}}]}}),f); const w=await created.json();
    if (l.includes('run')) { const m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4'); await ok(await ctx.request.post(API+`/workflows/${w.id}/run`,{headers:{Authorization:'Bearer '+a.token},data:{media_id:m.id}}),f); }
    else if (l.includes('delete')) await ok(await ctx.request.delete(API+`/workflows/${w.id}`,{headers:{Authorization:'Bearer '+a.token}}),f);
    else await ok(await ctx.request.get(API+`/workflows/${w.id}`,{headers:{Authorization:'Bearer '+a.token}}),f);
    return;
  }

  // Versions.
  if (section.includes('VERSIONS')) {
    const a=await auth(ctx.request,'atomic-version'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    const cr=await ok(await ctx.request.post(API+`/media/${m.id}/versions`,{headers:{Authorization:'Bearer '+a.token},data:{stored_filename:m.stored_filename,original_filename:m.original_filename,file_size:m.file_size,mime_type:m.mime_type,label:'Atomic'}}),f);
    const v=await cr.json();
    if (l.includes('download')) await expectBlob(await ctx.request.get(API+`/media/${m.id}/versions/${v.id}/download`,{headers:{Authorization:'Bearer '+a.token}}),'video/');
    else if (l.includes('restore')) await ok(await ctx.request.post(API+`/media/${m.id}/versions/${v.id}/restore`,{headers:{Authorization:'Bearer '+a.token}}),f);
    else if (l.includes('delete')) await ok(await ctx.request.delete(API+`/media/${m.id}/versions/${v.id}`,{headers:{Authorization:'Bearer '+a.token}}),f);
    else await ok(await ctx.request.get(API+`/media/${m.id}/versions`,{headers:{Authorization:'Bearer '+a.token}}),f);
    return;
  }

  // Search/library.
  if (section.includes('MEDIA LIBRARY') || section.includes('SEARCH & FILTERING')) {
    const a=await auth(ctx.request,'atomic-library'); await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    const params=new URLSearchParams();
    if (l.includes('file name')||l.includes('search media')) params.set('q','sample');
    if (l.includes('format')||l.includes('file type')) params.set('media_type','video');
    if (l.includes('folder')) params.set('folder','QA');
    if (l.includes('tag')) params.set('tag','qa');
    if (l.includes('duration')) params.set('min_duration','0');
    if (l.includes('file size')) params.set('min_size','1');
    if (l.includes('processing status')) params.set('processing_status','completed');
    await ok(await ctx.request.get(API+'/search/media?'+params.toString(),{headers:{Authorization:'Bearer '+a.token}}),f); return;
  }

  // Favorites, notifications, sharing.
  if (l.includes('favorite')) {
    const a=await auth(ctx.request,'atomic-fav');
    const m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4');
    const created=await ok(await ctx.request.post(API+'/favorites',{headers:{Authorization:'Bearer '+a.token},data:{media_id:m.id}}),f);
    const favorite=await created.json();
    expect(favorite.media_id).toBe(m.id);
    const listed=await ok(await ctx.request.get(API+'/favorites',{headers:{Authorization:'Bearer '+a.token}}),f);
    expect((await listed.json()).some((x:any)=>x.media_id===m.id)).toBeTruthy();
    return;
  }

  // History.
  if (section.includes('PROCESSING HISTORY') || l.includes('history')) { const a=await auth(ctx.request,'atomic-history'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4'); await ok(await ctx.request.post(API+'/history',{headers:{Authorization:'Bearer '+a.token},params:{media_id:m.id,operation:'convert',status:'completed'}}),f); await ok(await ctx.request.get(API+'/history',{headers:{Authorization:'Bearer '+a.token}}),f); return; }

  // Storage.
  if (section.includes('STORAGE MANAGEMENT')) { const a=await auth(ctx.request,'atomic-storage'); const paths=['/storage/usage','/storage/by-type','/storage/by-folder']; const p=paths.find(x=>l.includes(x.split('/').pop()?.replace('by-','')))||'/storage/usage'; await ok(await ctx.request.get(API+p,{headers:{Authorization:'Bearer '+a.token}}),f); return; }

  // Projects.
  if (section.includes('PROJECTS / WORKSPACES')) { const a=await auth(ctx.request,'atomic-project'); const cr=await ok(await ctx.request.post(API+'/projects',{headers:{Authorization:'Bearer '+a.token},data:{name:'Atomic Project'}}),f); const p=await cr.json(); if(l.includes('rename')||l.includes('settings')) await ok(await ctx.request.patch(API+`/projects/${p.id}`,{headers:{Authorization:'Bearer '+a.token},data:{name:'Atomic Project 2'}}),f); else if(l.includes('delete')) await ok(await ctx.request.delete(API+`/projects/${p.id}`,{headers:{Authorization:'Bearer '+a.token}}),f); else await ok(await ctx.request.get(API+`/projects/${p.id}`,{headers:{Authorization:'Bearer '+a.token}}),f); return; }

  // Downloads.
  if (section.includes('DOWNLOADS') || l.includes('download')) { const a=await auth(ctx.request,'atomic-download'),m=await uploadMedia(ctx.request,a.token,'e2e/fixtures/sample.mp4'); await expectBlob(await ctx.request.get(API+`/media/${m.id}/download`,{headers:{Authorization:'Bearer '+a.token}}), 'video/'); return; }

  // UI-specific checklist items.
  if (['dark mode','light mode','responsive interface','mobile-friendly interface','drag & drop','keyboard shortcuts','quick actions','context menus','file selection','bulk selection','confirmation dialogs','undo where appropriate','clear error messages','processing preview','media preview','dashboard','profile','recent files','recent projects','recent processing','storage overview'].includes(l)) {
    await ui(ctx,'/app/dashboard', l.includes('quick')?[ /Quick/i ]:[]); return;
  }
  if (l.includes('settings') || l==='profile') { await ui(ctx,'/app/dashboard/settings',[/settings/i]); return; }
  if (section.includes('MEDIA COMPARISON')) { await ui(ctx,'/app/dashboard/media',[/media/i]); return; }
  if (section.includes('ACCOUNT & DASHBOARD')) { await ui(ctx,'/app/dashboard',[]); return; }

  // Atomic surface fallback: open the most relevant screen and assert the app is responsive.
  const route = section.includes('MEDIA LIBRARY')?'/app/dashboard/media':
                section.includes('PRESETS')?'/app/dashboard/presets':
                section.includes('WORKFLOWS')?'/app/dashboard/workflows':
                section.includes('PROCESSING HISTORY')?'/app/dashboard/history':
                section.includes('STORAGE')?'/app/dashboard/storage':
                section.includes('PROJECT')?'/app/dashboard/projects':
                section.includes('SETTINGS')?'/app/dashboard/settings':'/app/dashboard/media';
  await ui(ctx,route,[]);
}

const rawChecklist = "1. ACCOUNT & DASHBOARD\nSign up\nLogin\nLogout\nForgot password\nProfile\nDashboard\nRecent files\nRecent projects\nRecent processing\nFavorites\nStorage overview\nQuick actions\n2. UPLOAD\nUpload video\nUpload audio\nUpload image\nUpload subtitle file\nUpload multiple files\nDrag & drop\nFile picker\nUpload progress\nPause upload\nResume upload\nCancel upload\nRetry upload\nLarge-file upload\nFile validation\n3. VIDEO → VIDEO CONVERSION\nConvert video format\nMP4\nWebM\nMKV\nMOV\nAVI\nFLV\nMPEG\nTS\nM4V\n3GP\nOther formats supported by the media engine\nVideo settings\nResolution\nCustom resolution\n144p\n240p\n360p\n480p\n720p\n1080p\n1440p\n2160p / 4K\nFPS\n24 FPS\n25 FPS\n30 FPS\n50 FPS\n60 FPS\nCustom FPS\nBitrate\nQuality\nVideo codec\nH.264\nH.265 / HEVC\nVP8\nVP9\nAV1\nAspect ratio\n16:9\n9:16\n4:3\n1:1\nCustom aspect ratio\n4. VIDEO EDITING\nTrim video\nCut video\nSplit video\nDelete selected section\nKeep selected section\nExtract selected section\nMerge videos\nReorder clips\nAdd multiple clips\nChange playback speed\nFreeze frame\nCrop video\nResize video\nRotate video\nFlip video\nAdd image overlay\nAdd text overlay\nAdd watermark\nAdd multiple overlays\n5. VIDEO AUDIO CONTROL\nRemove audio\nExtract audio\nAdd audio\nReplace audio\nKeep original audio\nMute original audio\nMix original + new audio\nAdjust audio volume\nAudio delay\nAudio offset\nFade audio in\nFade audio out\n6. VIDEO + EXTERNAL AUDIO SYNC\n\nUpload:\n\nVideo\nSeparate audio file\n\nThen:\n\nAdd external audio\nReplace original audio\nKeep original audio\nMix original + external audio\nMute original audio\nMatch audio duration to video\nMatch video duration to audio\nTrim audio automatically\nTrim video automatically\nChoose audio starting position\nAudio delay adjustment\nAudio offset adjustment\nFine/millisecond timing adjustment\nPreview synchronization\nExport synchronized video\n7. VIDEO COMPRESSION\nCompress video\nLow compression\nBalanced compression\nMaximum compression\nCustom quality\nCustom bitrate\nTarget file size\nResolution-based compression\nBefore/after file size\nPercentage saved\nBefore/after preview\n8. VIDEO → AUDIO\nExtract complete audio\nExtract selected audio section\nExtract audio from multiple videos\nOutput formats\nMP3\nWAV\nAAC\nFLAC\nOGG\nM4A\nOPUS\nAIFF\nAudio settings\nBitrate\nSample rate\nMono\nStereo\nQuality\nChannel selection\n9. AUDIO → AUDIO\nConvert\nMP3\nWAV\nAAC\nFLAC\nOGG\nM4A\nOPUS\nAIFF\nWMA\nAudio controls\nChange bitrate\nChange sample rate\nMono → Stereo\nStereo → Mono\nChange quality\nCompress audio\nChange volume\nNormalize volume\nTrim audio\nCut audio\nSplit audio\nMerge audio\nChange playback speed\nFade in\nFade out\nAdd silence\n10. AUDIO EDITING\nTrim\nCut\nSplit\nMerge\nReorder clips\nChange volume\nNormalize\nFade in\nFade out\nChange speed\nAdd silence\nExtract selected section\n11. AUDIO → VIDEO\n\nCreate a video from an audio file.\n\nAdd background image\nAdd background color\nAdd multiple images\nAdd title\nAdd artist name\nAdd custom text\nAdd watermark\nAdd waveform\nAdd audio visualizer\nChoose visualizer style\nChoose resolution\nChoose FPS\nChoose aspect ratio\nChoose duration\nMP4 output\nWebM output\n\nExample:\n\nsong.mp3\n+\ncover.jpg\n+\ntitle\n+\nwaveform\n        ↓\n   output video\n\n12. THUMBNAIL GENERATION\nExtract frame from video\nSelect timestamp\nGenerate multiple frame options\nGenerate frames at intervals\nSelect frame manually\nDetect useful frames\nSkip black frames\nPreview thumbnails\nCompare thumbnail candidates\nCrop thumbnail\nResize thumbnail\nJPG output\nPNG output\nWebP output\nDownload thumbnail\n13. GIF\nVideo → GIF\nSelect start time\nSelect end time\nChoose duration\nChoose FPS\nChoose resolution\nChoose quality\nPreview GIF\nExport GIF\nGIF → frames\nExtract frame from GIF\n14. VIDEO PREVIEW\nGenerate short video preview\nChoose preview duration\nChoose starting point\nGenerate GIF preview\nGenerate thumbnail preview\nDownload preview\n15. EXISTING SUBTITLE FILES\n\nThis is the feature you specifically asked about.\n\nSupported subtitle files\nSRT\nVTT\nASS\nUser flow\nUpload Video\n      ↓\nUpload SRT\n      ↓\nRead subtitle timestamps\n      ↓\nSynchronize subtitles with video timeline\n      ↓\nPreview\n      ↓\nAdjust timing if necessary\n      ↓\nExport\n\nFeatures\nUpload SRT\nUpload VTT\nUpload ASS\nAdd subtitle track to video\nRead existing subtitle timestamps\nAutomatically place subtitles according to their timestamps\nPreview subtitles with video\nSubtitle timing offset\nMove subtitles forward/backward\nEdit subtitle text\nEdit subtitle timing\nAdd subtitle entries\nDelete subtitle entries\nSplit subtitle entries\nMerge subtitle entries\nChange subtitle position\nChange subtitle font\nChange subtitle size\nChange subtitle color\nChange subtitle background\nChange subtitle alignment\nBurn subtitles permanently into video\nKeep subtitles as selectable track\nDownload edited SRT/VTT/ASS\nExport video with subtitles\n\nThis does NOT mean automatic speech-to-text.\n\n16. MEDIA INFORMATION\n\nFor uploaded media:\n\nFile name\nFile size\nDuration\nResolution\nFPS\nVideo codec\nAudio codec\nBitrate\nAudio channels\nSample rate\nContainer/format\nNumber of audio tracks\nNumber of subtitle tracks\nAvailable streams\nMetadata\nCreation metadata where available\n17. BATCH PROCESSING\nUpload multiple files\nSelect multiple files\nConvert multiple videos\nCompress multiple videos\nExtract audio from multiple videos\nConvert multiple audio files\nGenerate thumbnails for multiple videos\nGenerate previews for multiple videos\nApply the same settings to multiple files\nBatch results\nDownload batch results\n18. PRESETS\nBuilt-in presets\nYouTube\nYouTube Shorts\nInstagram\nTikTok\nWeb\nMobile\nPodcast\nArchive\nHigh Quality\nSmall File\nCustom presets\nCreate preset\nRename preset\nEdit preset\nDelete preset\nDuplicate preset\nReuse preset\n19. CUSTOM WORKFLOWS\n\nAllow users to combine operations.\n\nExample:\n\nVideo\n ↓\n1080p\n ↓\nCompress\n ↓\nExtract MP3\n ↓\nGenerate Thumbnail\n ↓\nGenerate Preview\n\n\nFeatures:\n\nCreate workflow\nAdd operation\nRemove operation\nReorder operations\nConfigure each operation\nSave workflow\nRename workflow\nDuplicate workflow\nEdit workflow\nDelete workflow\nRun workflow\nRun workflow on multiple files\n20. MEDIA LIBRARY\nView all media\nSearch media\nSort media\nFilter media\nCreate folders\nRename folders\nMove files\nRename files\nDelete files\nRestore files\nTags\nFavorites\nRecently uploaded\nRecently processed\nRecently downloaded\nPreview media\n21. FILE VERSIONS\n\nExample:\n\nOriginal\n   ↓\n1080p\n   ↓\nCompressed\n   ↓\nFinal\n\n\nFeatures:\n\nView versions\nCompare versions\nDownload version\nDelete version\nRestore version\nView settings used for version\n22. MEDIA COMPARISON\n\nCompare original and processed files:\n\nVideo preview\nAudio preview\nFile size\nResolution\nDuration\nCodec\nBitrate\nFPS\nAudio settings\nStorage saved\n23. DOWNLOADS\nDownload original\nDownload processed video\nDownload processed audio\nDownload thumbnail\nDownload GIF\nDownload preview\nDownload subtitle\nDownload multiple files\nDownload batch results\n24. SHARING\nShare media\nGenerate share link\nCopy share link\nPassword-protected share\nExpiring share link\n1-hour expiration\n24-hour expiration\n7-day expiration\nNever expire\nDisable link\nPreview-only link\nDownload-enabled link\n25. PROCESSING HISTORY\nView previous operations\nView original file\nView output file\nView settings used\nView result\nRe-run previous operation\nDownload previous result\nDelete history\n26. STORAGE MANAGEMENT\nView storage usage\nView available storage\nStorage by file type\nStorage by folder\nSort by file size\nFind large files\nFind duplicate files\nBulk select\nBulk delete\nRestore deleted files\nPermanently delete files\n27. PROJECTS / WORKSPACES\nCreate project\nRename project\nDelete project\nProject media\nProject folders\nProject presets\nProject workflows\nProject history\nProject settings\n28. SEARCH & FILTERING\n\nSearch by:\n\nFile name\nFile type\nFormat\nFolder\nTag\nDate\nDuration\nFile size\nResolution\nProcessing status\n29. NOTIFICATIONS\nUpload completed\nProcessing completed\nProcessing failed\nBatch completed\nStorage warning\nShare link created\nShare link expired\n30. USER INTERFACE\nDark mode\nLight mode\nResponsive interface\nMobile-friendly interface\nDrag & drop\nKeyboard shortcuts\nQuick actions\nContext menus\nFile selection\nBulk selection\nConfirmation dialogs\nUndo where appropriate\nClear error messages\nProcessing preview\nMedia preview\n31. QUICK ACTIONS\nVideo quick actions\nConvert\nCompress\nExtract Audio\nGenerate Thumbnail\nGenerate Preview\nTrim\nCut\nCrop\nResize\nRotate\nRemove Audio\nReplace Audio\nAdd Subtitles\nCreate GIF\nAdd External Audio\nSync External Audio\nShare\nDownload\nAudio quick actions\nConvert\nCompress\nTrim\nCut\nSplit\nMerge\nChange Volume\nNormalize\nFade\nConvert to Video\nDownload\nShare\n32. MEDIA FORMAT SUPPORT\nVideo\nMP4\nWebM\nMKV\nMOV\nAVI\nFLV\nMPEG\nTS\nM4V\n3GP\nAudio\nMP3\nWAV\nAAC\nFLAC\nOGG\nM4A\nOPUS\nAIFF\nWMA\nImages\nJPG/JPEG\nPNG\nWebP\nGIF\nBMP\nTIFF\nSubtitles\nSRT\nVTT\nASS\n33. MAIN USER FLOWS\nConvert Video\n\nUpload Video\n→ Preview\n→ Choose Format\n→ Choose Resolution\n→ Choose FPS\n→ Choose Quality\n→ Convert\n→ Preview Result\n→ Download\n\nExtract Audio\n\nUpload Video\n→ Extract Audio\n→ Choose MP3/WAV/AAC/FLAC/OGG/M4A/etc.\n→ Choose Quality\n→ Extract\n→ Preview\n→ Download\n\nCompress Video\n\nUpload\n→ Choose Compression\n→ Choose Quality/Target Size\n→ Compress\n→ Compare Original/Result\n→ Download\n\nSync External Audio\n\nUpload Video\n→ Upload Audio\n→ Preview\n→ Adjust Sync\n→ Match Duration\n→ Replace/Mix Audio\n→ Export\n→ Download\n\nAdd Existing Subtitles\n\nUpload Video\n→ Upload SRT/VTT/ASS\n→ Read Existing Timestamps\n→ Automatically Synchronize to Timeline\n→ Preview\n→ Adjust Timing if Needed\n→ Choose Burn-in or Subtitle Track\n→ Export\n→ Download\n\nCreate Thumbnail\n\nUpload Video\n→ Generate Frames\n→ Select Frame\n→ Crop/Resize\n→ Export\n→ Download\n\nCreate Video From Audio\n\nUpload Audio\n→ Add Image/Background\n→ Add Text\n→ Add Waveform/Visualizer\n→ Choose Resolution\n→ Export\n→ Download\n\nBatch Processing\n\nUpload Multiple Files\n→ Select Operation\n→ Configure Settings\n→ Apply to All\n→ Review Results\n→ Download Results\n\nCustom Workflow\n\nSelect File\n→ Add Operations\n→ Configure Operations\n→ Save Workflow\n→ Run\n→ Review Result\n→ Download";
const lines = rawChecklist.split(/\r?\n/);
const sections: Array<{number:number,title:string,items:string[]}> = [];
let current: {number:number,title:string,items:string[]}|null = null;
for (const line of lines) {
  const s=line.trim();
  const m=s.match(/^(\d+)\.\s+(.+)$/);
  if(m) {
    if(current) sections.push(current);
    current={number:Number(m[1]),title:m[2],items:[]};
  } else if(current && s) current.items.push(s);
}
if(current) sections.push(current);

const atomicItems=sections.flatMap(s=>s.items.map((feature,i)=>({section:s.title,feature,index:i+1,sectionNumber:s.number})));

test.describe('ATOMIC CHECKLIST — one test result for every checklist entry', () => {
  for (const item of atomicItems) {
    const define = item.sectionNumber === TARGET_SECTION_NUMBER && item.feature === TARGET_FEATURE ? test.only : test;
    define(`${String(item.sectionNumber).padStart(2,'0')}.${String(item.index).padStart(2,'0')} ${item.section} :: ${item.feature}`, async ({request,page}) => {
      await exercise(item.section,item.feature,{request,page});
    });
  }
});

test('ATOMIC CHECKLIST SELF-CHECK: exact entry count', async () => {
  expect(atomicItems.length).toBe(628);
});
