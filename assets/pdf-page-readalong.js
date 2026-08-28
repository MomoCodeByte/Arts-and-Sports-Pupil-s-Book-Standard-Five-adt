(() => {
  "use strict";

  // The ADT runtime already owns recorded narration, playback state,
  // language selection, speed, volume, and timecode highlighting. Earlier
  // PDF conversion code replaced HTMLMediaElement.play() and expected
  // `.read-word` nodes that semantic pages no longer contain. Keep this file
  // as a small compatibility bridge so existing page script order remains
  // stable without competing with the native reader.

  const legacyControls = document.querySelector(".page-voice-controls");
  if (legacyControls) legacyControls.remove();

  if (window.__adtAudioTrackingInstalled) return;
  window.__adtAudioTrackingInstalled = true;

  const NativeAudio = window.Audio;
  if (typeof NativeAudio !== "function") return;

  const tracked = [];

  function TrackedAudio(src) {
    const audio = new NativeAudio(src);
    tracked.push(audio);
    if (/\/content\/i18n\/[^/]+\/audio\//i.test(String(src || ""))) {
      const nativePlay = audio.play.bind(audio);
      audio.play = function () {
        if (window.__adtUseImaniNarration !== false) {
          audio.pause();
          return Promise.resolve();
        }
        return nativePlay();
      };
    }
    return audio;
  }

  TrackedAudio.prototype = NativeAudio.prototype;
  Object.setPrototypeOf(TrackedAudio, NativeAudio);
  window.Audio = TrackedAudio;

  window.__adtGetNarrationAudio = function () {
    for (let index = tracked.length - 1; index >= 0; index -= 1) {
      const audio = tracked[index];
      const source = String(audio.currentSrc || audio.src || "");
      if (/\/content\/(?:i18n\/[^/]+\/audio|imani)\//i.test(source)) return audio;
    }
    return null;
  };

  // The semantic-page accessibility layer uses the already bundled Imani
  // recordings. Expose the unwrapped constructor so it can play one page-long
  // recording without competing with the ADT runtime's per-block audio.
  window.__adtNativeAudio = NativeAudio;
  window.__adtUseImaniNarration = true;
  window.__adtStopBundledNarration = function () {
    tracked.forEach((audio) => {
      const source = String(audio.currentSrc || audio.src || "");
      if (!/\/content\/i18n\/[^/]+\/audio\//i.test(source)) return;
      audio.pause();
      try { audio.currentTime = 0; } catch (_error) {}
    });
  };
})();
