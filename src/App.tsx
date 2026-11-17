/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'motion/react';

// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const videoRef3 = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgWrapperRef = useRef<HTMLDivElement>(null);

  // States
  const [video1Duration, setVideo1Duration] = useState<number>(0);
  const [video2Duration, setVideo2Duration] = useState<number>(0);
  const [video3Duration, setVideo3Duration] = useState<number>(0);
  const [isMeta1Loaded, setIsMeta1Loaded] = useState<boolean>(false);
  const [isMeta2Loaded, setIsMeta2Loaded] = useState<boolean>(false);
  const [isMeta3Loaded, setIsMeta3Loaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress1, setLoadingProgress1] = useState<number>(0);
  const [loadingProgress2, setLoadingProgress2] = useState<number>(0);
  const [loadingProgress3, setLoadingProgress3] = useState<number>(0);
  const [isCanvasTainted, setIsCanvasTainted] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Google Drive File IDs
  const id1 = "1X94O9QFML--SHmmXLKklcwBKHzgLBd6I";
  const id2 = "1XJM_3dhveM9L0j9uM5jnimHlyhxD0Kbh";
  const id3 = "1NeM-lxKHfX0daY5BrgZfgZ9yW1W-SPE5";

  const [videoSrc1, setVideoSrc1] = useState<string>(`/api/video?id=${id1}`);
  const [videoSrc2, setVideoSrc2] = useState<string>(`/api/video?id=${id2}`);
  const [videoSrc3, setVideoSrc3] = useState<string>(`/api/video?id=${id3}`);

  // Derived loading progress average
  const loadingProgress = Math.round((loadingProgress1 + loadingProgress2 + loadingProgress3) / 3);

  // Animation values
  const targetProgressRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(0);
  const lastTimeRef = useRef<string>('');

  // HTML Element Refs for Scroll-based Blur / Motion Face out
  const brandHeaderRef = useRef<HTMLDivElement>(null);
  const navHeaderRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const featuresContainerRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const missionContainerRef = useRef<HTMLDivElement>(null);
  const missionPara1Ref = useRef<HTMLDivElement>(null);
  const missionPara2Ref = useRef<HTMLDivElement>(null);
  const missionPara3Ref = useRef<HTMLDivElement>(null);
  const feedbackContainerRef = useRef<HTMLDivElement>(null);
  const feedbackFormRef = useRef<HTMLDivElement>(null);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setIsSubmitted(true);
    }
  };

  // Resize handler for full screen canvas
  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const p = currentProgressRef.current;
    const video = p <= 0.333
      ? videoRef1.current
      : p <= 0.666
        ? videoRef2.current
        : videoRef3.current;
    if (!video) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const pWidth = parent.clientWidth;
    const pHeight = parent.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = pWidth * dpr;
    canvas.height = pHeight * dpr;
    canvas.style.width = `${pWidth}px`;
    canvas.style.height = `${pHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
       ctx.scale(dpr, dpr);
    }
    
    // Draw immediate frame after resize
    drawFrame();
  };

  // Cover image style rendering on Canvas
  const drawFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas || isCanvasTainted) return;

    const p = currentProgressRef.current;
    const video = p <= 0.333
      ? videoRef1.current
      : p <= 0.666
        ? videoRef2.current
        : videoRef3.current;
    if (!video || video.readyState < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vWidth = video.videoWidth || 1920;
    const vHeight = video.videoHeight || 1080;
    const dpr = window.devicePixelRatio || 1;
    const cWidth = canvas.width / dpr;
    const cHeight = canvas.height / dpr;

    const vAspect = vWidth / vHeight;
    const cAspect = cWidth / cHeight;

    let drawWidth = cWidth;
    let drawHeight = cHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (vAspect > cAspect) {
      drawWidth = cHeight * vAspect;
      offsetX = (cWidth - drawWidth) / 2;
    } else {
      drawHeight = cWidth / vAspect;
      offsetY = (cHeight - drawHeight) / 2;
    }

    try {
      ctx.clearRect(0, 0, cWidth, cHeight);
      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
    } catch (error) {
      // If CORS taints the canvas, fallback immediately to direct video display
      console.warn('Canvas got CORS tainted. Falling back to native video DOM placement.', error);
      setIsCanvasTainted(true);
    }
  };

  // Video 1 Load Monitoring
  useEffect(() => {
    const video = videoRef1.current;
    if (!video) return;

    let progressInterval: NodeJS.Timeout;

    const onProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration || 1;
        const percent = Math.min((bufferedEnd / duration) * 100, 100);
        setLoadingProgress1(Math.round(percent));
      }
      
      const dur = video.duration;
      if (dur && !isNaN(dur) && dur > 0 && dur !== Infinity && !isMeta1Loaded) {
        setVideo1Duration(dur);
        setIsMeta1Loaded(true);
      }
    };

    const onLoadedMetadata = () => {
      const dur = video.duration;
      if (dur && !isNaN(dur) && dur > 0 && dur !== Infinity) {
        setVideo1Duration(dur);
        setIsMeta1Loaded(true);
      } else if (dur === Infinity || isNaN(dur)) {
        // Safe default fallback in case metadata is streaming
        setVideo1Duration(5);
        setIsMeta1Loaded(true);
      }
    };

    const onSeeked = () => {
      if (!isCanvasTainted && currentProgressRef.current <= 0.333) {
        drawFrame();
      }
    };

    const onError = (e: any) => {
      console.error('Error loading video 1, using fallback:', e);
      const fallbackUrl = 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-3112-large.mp4';
      if (videoSrc1 !== fallbackUrl) {
        setVideoSrc1(fallbackUrl);
        setLoadingProgress1(0);
      } else {
        setHasError(true);
      }
    };

    video.addEventListener('progress', onProgress);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('durationchange', onLoadedMetadata);
    video.addEventListener('canplay', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    // Initial check in case resource was already cached/loaded
    if (video.readyState >= 1) {
      onLoadedMetadata();
      onProgress();
    }

    progressInterval = setInterval(onProgress, 300);

    return () => {
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('durationchange', onLoadedMetadata);
      video.removeEventListener('canplay', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      clearInterval(progressInterval);
    };
  }, [videoSrc1, isMeta1Loaded]);

  // Video 2 Load Monitoring
  useEffect(() => {
    const video = videoRef2.current;
    if (!video) return;

    let progressInterval: NodeJS.Timeout;

    const onProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration || 1;
        const percent = Math.min((bufferedEnd / duration) * 100, 100);
        setLoadingProgress2(Math.round(percent));
      }

      const dur = video.duration;
      if (dur && !isNaN(dur) && dur > 0 && dur !== Infinity && !isMeta2Loaded) {
        setVideo2Duration(dur);
        setIsMeta2Loaded(true);
      }
    };

    const onLoadedMetadata = () => {
      const dur = video.duration;
      if (dur && !isNaN(dur) && dur > 0 && dur !== Infinity) {
        setVideo2Duration(dur);
        setIsMeta2Loaded(true);
      } else if (dur === Infinity || isNaN(dur)) {
        // Safe default fallback in case metadata is streaming
        setVideo2Duration(5);
        setIsMeta2Loaded(true);
      }
    };

    const onSeeked = () => {
      if (!isCanvasTainted && currentProgressRef.current > 0.333 && currentProgressRef.current <= 0.666) {
        drawFrame();
      }
    };

    const onError = (e: any) => {
      console.error('Error loading video 2, using fallback:', e);
      const fallbackUrl = 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4';
      if (videoSrc2 !== fallbackUrl) {
        setVideoSrc2(fallbackUrl);
        setLoadingProgress2(0);
      } else {
        setHasError(true);
      }
    };

    video.addEventListener('progress', onProgress);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('durationchange', onLoadedMetadata);
    video.addEventListener('canplay', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    // Initial check in case resource was already cached/loaded
    if (video.readyState >= 1) {
      onLoadedMetadata();
      onProgress();
    }

    progressInterval = setInterval(onProgress, 300);

    return () => {
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('durationchange', onLoadedMetadata);
      video.removeEventListener('canplay', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      clearInterval(progressInterval);
    };
  }, [videoSrc2, isMeta2Loaded]);

  // Video 3 Load Monitoring
  useEffect(() => {
    const video = videoRef3.current;
    if (!video) return;

    let progressInterval: NodeJS.Timeout;

    const onProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration || 1;
        const percent = Math.min((bufferedEnd / duration) * 100, 100);
        setLoadingProgress3(Math.round(percent));
      }

      const dur = video.duration;
      if (dur && !isNaN(dur) && dur > 0 && dur !== Infinity && !isMeta3Loaded) {
        setVideo3Duration(dur);
        setIsMeta3Loaded(true);
      }
    };

    const onLoadedMetadata = () => {
      const dur = video.duration;
      if (dur && !isNaN(dur) && dur > 0 && dur !== Infinity) {
        setVideo3Duration(dur);
        setIsMeta3Loaded(true);
      } else if (dur === Infinity || isNaN(dur)) {
        // Safe default fallback in case metadata is streaming
        setVideo3Duration(5);
        setIsMeta3Loaded(true);
      }
    };

    const onSeeked = () => {
      if (!isCanvasTainted && currentProgressRef.current > 0.666) {
        drawFrame();
      }
    };

    const onError = (e: any) => {
      console.error('Error loading video 3, using fallback:', e);
      const fallbackUrl = 'https://assets.mixkit.co/videos/preview/mixkit-underwater-light-beams-background-3113-large.mp4';
      if (videoSrc3 !== fallbackUrl) {
        setVideoSrc3(fallbackUrl);
        setLoadingProgress3(0);
      } else {
        setHasError(true);
      }
    };

    video.addEventListener('progress', onProgress);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('durationchange', onLoadedMetadata);
    video.addEventListener('canplay', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    // Initial check in case resource was already cached/loaded
    if (video.readyState >= 1) {
      onLoadedMetadata();
      onProgress();
    }

    progressInterval = setInterval(onProgress, 300);

    return () => {
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('durationchange', onLoadedMetadata);
      video.removeEventListener('canplay', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      clearInterval(progressInterval);
    };
  }, [videoSrc3, isMeta3Loaded]);

  // Handle Loading Completion
  useEffect(() => {
    if (isMeta1Loaded && isMeta2Loaded && isMeta3Loaded) {
      setIsLoading(false);
      ScrollTrigger.refresh();
      handleResize();
    }
  }, [isMeta1Loaded, isMeta2Loaded, isMeta3Loaded]);

  // Handle Event Resizes
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [video1Duration, video2Duration, video3Duration, isCanvasTainted]);

  // Handle Cursor Parallax on background video
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const bgWrapper = bgWrapperRef.current;
      if (!bgWrapper) return;

      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      // Calculate normalized cursor position from -1 to 1
      const x = (clientX - innerWidth / 2) / (innerWidth / 2);
      const y = (clientY - innerHeight / 2) / (innerHeight / 2);

      // Maximum offset to prevent edges showing (fits the 5% margin safely)
      const maxOffset = 24; 
      const moveX = x * -maxOffset;
      const moveY = y * -maxOffset;

      bgWrapper.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // GSAP ScrollTrigger Integration
  useEffect(() => {
    if (!containerRef.current) return;

    const d1 = video1Duration || (videoRef1.current?.duration) || 0;
    const d2 = video2Duration || (videoRef2.current?.duration) || 0;
    const d3 = video3Duration || (videoRef3.current?.duration) || 0;

    if (d1 === 0 || d2 === 0 || d3 === 0) return;

    // Standard GSAP ScrollTrigger
    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2, // Smooth interpolation with scroll friction
      onUpdate: (self) => {
        targetProgressRef.current = self.progress;
      },
    });

    return () => {
      trigger.kill();
    };
  }, [video1Duration, video2Duration, video3Duration]);

  // RequestAnimationFrame Smooth Render Loop
  useEffect(() => {
    let rAF: number;

    const tick = () => {
      const v1 = videoRef1.current;
      const v2 = videoRef2.current;
      const v3 = videoRef3.current;
      if (!v1 || !v2 || !v3) {
        rAF = requestAnimationFrame(tick);
        return;
      }

      // Smooth progress lerping to ensure cinematic frame pacing
      currentProgressRef.current += (targetProgressRef.current - currentProgressRef.current) * 0.08;

      const p = currentProgressRef.current;

      // 1. Botanical Card (Disappears immediately, translating left and down with blur)
      if (cardRef.current) {
        const f_card = Math.min(1, Math.max(0, p / 0.15));
        cardRef.current.style.opacity = (1 - f_card).toString();
        cardRef.current.style.filter = f_card > 0.001 ? `blur(${f_card * 16}px)` : 'none';
        cardRef.current.style.transform = `translate3d(${f_card * -35}px, ${f_card * 35}px, 0)`;
        cardRef.current.style.pointerEvents = f_card > 0.95 ? 'none' : 'auto';
      }

      // 2. Navigation Header (Disappears with slight delay, translating upwards with blur)
      if (navHeaderRef.current) {
        const f_nav = Math.min(1, Math.max(0, (p - 0.03) / 0.15));
        navHeaderRef.current.style.opacity = (1 - f_nav).toString();
        navHeaderRef.current.style.filter = f_nav > 0.001 ? `blur(${f_nav * 14}px)` : 'none';
        navHeaderRef.current.style.transform = `translate3d(0, ${f_nav * -35}px, 0)`;
        navHeaderRef.current.style.pointerEvents = f_nav > 0.95 ? 'none' : 'auto';
      }

      // 3. Brand Header Logo & Text (Disappears last with most delay, translating left and upwards with blur)
      if (brandHeaderRef.current) {
        const f_brand = Math.min(1, Math.max(0, (p - 0.06) / 0.15));
        brandHeaderRef.current.style.opacity = (1 - f_brand).toString();
        brandHeaderRef.current.style.filter = f_brand > 0.001 ? `blur(${f_brand * 12}px)` : 'none';
        brandHeaderRef.current.style.transform = `translate3d(${f_brand * -25}px, ${f_brand * -35}px, 0)`;
        brandHeaderRef.current.style.pointerEvents = f_brand > 0.95 ? 'none' : 'auto';
      }

      // 4. Staggered Feature Cards (appear at the end of the first video, disappear into the second video)
      if (card1Ref.current && card2Ref.current && card3Ref.current && featuresContainerRef.current) {
        if (p > 0.13 && p < 0.55) {
          featuresContainerRef.current.style.pointerEvents = 'auto';
          featuresContainerRef.current.style.display = 'grid';
        } else {
          featuresContainerRef.current.style.pointerEvents = 'none';
          featuresContainerRef.current.style.display = 'none';
        }

        // --- CARD 1 ANIMATION ---
        let opacity1 = 0;
        let blur1 = 16;
        let tx1 = -35;
        let ty1 = 35;

        if (p >= 0.15 && p <= 0.333) {
          // Entrance phase
          const ratio = Math.min(1, Math.max(0, (p - 0.15) / 0.15));
          opacity1 = ratio;
          blur1 = (1 - ratio) * 16;
          tx1 = (1 - ratio) * -35;
          ty1 = (1 - ratio) * 35;
        } else if (p > 0.333 && p <= 0.45) {
          // Exit phase (translates left and down with blur, matches first screen transition style)
          const ratio = Math.min(1, Math.max(0, (p - 0.333) / 0.12));
          opacity1 = 1 - ratio;
          blur1 = ratio * 16;
          tx1 = ratio * -35;
          ty1 = ratio * 35;
        } else if (p > 0.45) {
          opacity1 = 0;
          blur1 = 16;
          tx1 = -35;
          ty1 = 35;
        }

        card1Ref.current.style.opacity = opacity1.toString();
        card1Ref.current.style.filter = opacity1 > 0.001 && opacity1 < 0.999 ? `blur(${blur1}px)` : 'none';
        card1Ref.current.style.transform = `translate3d(${tx1}px, ${ty1}px, 0)`;

        // --- CARD 2 ANIMATION ---
        let opacity2 = 0;
        let blur2 = 16;
        let tx2 = 0;
        let ty2 = 35;

        if (p >= 0.18 && p <= 0.333) {
          // Entrance phase
          const ratio = Math.min(1, Math.max(0, (p - 0.18) / 0.13));
          opacity2 = ratio;
          blur2 = (1 - ratio) * 16;
          tx2 = 0;
          ty2 = (1 - ratio) * 35;
        } else if (p > 0.333 && p <= 0.48) {
          // Exit phase (translates straight down with blur)
          const ratio = Math.min(1, Math.max(0, (p - 0.333) / 0.15));
          opacity2 = 1 - ratio;
          blur2 = ratio * 16;
          tx2 = 0;
          ty2 = ratio * 35;
        } else if (p > 0.48) {
          opacity2 = 0;
          blur2 = 16;
          tx2 = 0;
          ty2 = 35;
        }

        card2Ref.current.style.opacity = opacity2.toString();
        card2Ref.current.style.filter = opacity2 > 0.001 && opacity2 < 0.999 ? `blur(${blur2}px)` : 'none';
        card2Ref.current.style.transform = `translate3d(${tx2}px, ${ty2}px, 0)`;

        // --- CARD 3 ANIMATION ---
        let opacity3 = 0;
        let blur3 = 16;
        let tx3 = 35;
        let ty3 = 35;

        if (p >= 0.21 && p <= 0.333) {
          // Entrance phase
          const ratio = Math.min(1, Math.max(0, (p - 0.21) / 0.11));
          opacity3 = ratio;
          blur3 = (1 - ratio) * 16;
          tx3 = (1 - ratio) * 35;
          ty3 = (1 - ratio) * 35;
        } else if (p > 0.333 && p <= 0.51) {
          // Exit phase (translates right and down with blur)
          const ratio = Math.min(1, Math.max(0, (p - 0.333) / 0.18));
          opacity3 = 1 - ratio;
          blur3 = ratio * 16;
          tx3 = ratio * 35;
          ty3 = ratio * 35;
        } else if (p > 0.51) {
          opacity3 = 0;
          blur3 = 16;
          tx3 = 35;
          ty3 = 35;
        }

        card3Ref.current.style.opacity = opacity3.toString();
        card3Ref.current.style.filter = opacity3 > 0.001 && opacity3 < 0.999 ? `blur(${blur3}px)` : 'none';
        card3Ref.current.style.transform = `translate3d(${tx3}px, ${ty3}px, 0)`;
      }

      // 5. Staggered Company Mission Text (appears after feature cards vanish, during second/third videos, p >= 0.44 to 1.0)
      if (missionContainerRef.current && missionPara1Ref.current && missionPara2Ref.current && missionPara3Ref.current) {
        if (p > 0.44) {
          missionContainerRef.current.style.display = 'flex';
          missionContainerRef.current.style.pointerEvents = 'auto';
        } else {
          missionContainerRef.current.style.display = 'none';
          missionContainerRef.current.style.pointerEvents = 'none';
        }

        // --- MISSION PARAGRAPH 1 ---
        // Snappy entry (0.44 to 0.47), stable center hold (0.47 to 0.59), snappy exit (0.59 to 0.62)
        let op1 = 0;
        let bl1 = 20;
        let y1 = 120;

        if (p < 0.44) {
          op1 = 0;
          bl1 = 20;
          y1 = 120;
        } else if (p >= 0.44 && p < 0.47) {
          const ratio = (p - 0.44) / 0.03;
          op1 = ratio;
          bl1 = (1 - ratio) * 20;
          y1 = (1 - ratio) * 120;
        } else if (p >= 0.47 && p <= 0.59) {
          op1 = 1;
          bl1 = 0;
          y1 = 0;
        } else if (p > 0.59 && p <= 0.62) {
          const ratio = (p - 0.59) / 0.03;
          op1 = 1 - ratio;
          bl1 = ratio * 20;
          y1 = ratio * -120;
        } else if (p > 0.62) {
          op1 = 0;
          bl1 = 20;
          y1 = -120;
        }

        missionPara1Ref.current.style.opacity = op1.toString();
        missionPara1Ref.current.style.filter = op1 > 0.001 && op1 < 0.999 ? `blur(${bl1}px)` : 'none';
        missionPara1Ref.current.style.transform = `translate3d(0, ${y1}px, 0)`;

        // --- MISSION PARAGRAPH 2 ---
        // Snappy entry (0.62 to 0.65), stable center hold (0.65 to 0.77), snappy exit (0.77 to 0.80)
        let op2 = 0;
        let bl2 = 20;
        let y2 = 120;

        if (p < 0.62) {
          op2 = 0;
          bl2 = 20;
          y2 = 120;
        } else if (p >= 0.62 && p < 0.65) {
          const ratio = (p - 0.62) / 0.03;
          op2 = ratio;
          bl2 = (1 - ratio) * 20;
          y2 = (1 - ratio) * 120;
        } else if (p >= 0.65 && p <= 0.77) {
          op2 = 1;
          bl2 = 0;
          y2 = 0;
        } else if (p > 0.77 && p <= 0.80) {
          const ratio = (p - 0.77) / 0.03;
          op2 = 1 - ratio;
          bl2 = ratio * 20;
          y2 = ratio * -120;
        } else if (p > 0.80) {
          op2 = 0;
          bl2 = 20;
          y2 = -120;
        }

        missionPara2Ref.current.style.opacity = op2.toString();
        missionPara2Ref.current.style.filter = op2 > 0.001 && op2 < 0.999 ? `blur(${bl2}px)` : 'none';
        missionPara2Ref.current.style.transform = `translate3d(0, ${y2}px, 0)`;

        // --- MISSION PARAGRAPH 3 ---
        // Snappy entry (0.80 to 0.83), stable center hold (0.83 to 0.95), snappy exit (0.95 to 0.98)
        let op3 = 0;
        let bl3 = 20;
        let y3 = 120;

        if (p < 0.80) {
          op3 = 0;
          bl3 = 20;
          y3 = 120;
        } else if (p >= 0.80 && p < 0.83) {
          const ratio = (p - 0.80) / 0.03;
          op3 = ratio;
          bl3 = (1 - ratio) * 20;
          y3 = (1 - ratio) * 120;
        } else if (p >= 0.83 && p <= 0.95) {
          op3 = 1;
          bl3 = 0;
          y3 = 0;
        } else if (p > 0.95 && p <= 0.98) {
          const ratio = (p - 0.95) / 0.03;
          op3 = 1 - ratio;
          bl3 = ratio * 20;
          y3 = ratio * -120;
        } else if (p > 0.98) {
          op3 = 0;
          bl3 = 20;
          y3 = -120;
        }

        missionPara3Ref.current.style.opacity = op3.toString();
        missionPara3Ref.current.style.filter = op3 > 0.001 && op3 < 0.999 ? `blur(${bl3}px)` : 'none';
        missionPara3Ref.current.style.transform = `translate3d(0, ${y3}px, 0)`;

        // --- FEEDBACK FORM OVERLAY ---
        // Appears at the very final stage of the scroll (p >= 0.93 to 1.0)
        if (feedbackContainerRef.current && feedbackFormRef.current) {
          if (p > 0.93) {
            feedbackContainerRef.current.style.display = 'flex';
            feedbackContainerRef.current.style.pointerEvents = 'auto';

            let opForm = 0;
            let blForm = 20;
            let yForm = 120;

            if (p < 0.94) {
              opForm = 0;
              blForm = 20;
              yForm = 120;
            } else if (p >= 0.94 && p < 0.97) {
              const ratio = (p - 0.94) / 0.03;
              opForm = ratio;
              blForm = (1 - ratio) * 20;
              yForm = (1 - ratio) * 120;
            } else {
              opForm = 1;
              blForm = 0;
              yForm = 0;
            }

            feedbackFormRef.current.style.opacity = opForm.toString();
            feedbackFormRef.current.style.filter = opForm > 0.001 && opForm < 0.999 ? `blur(${blForm}px)` : 'none';
            feedbackFormRef.current.style.transform = `translate3d(0, ${yForm}px, 0)`;
          } else {
            feedbackContainerRef.current.style.display = 'none';
            feedbackContainerRef.current.style.pointerEvents = 'none';
          }
        }
      }

      // Triple video range calculations
      const p1 = Math.max(0, Math.min(1, p * 3));
      const p2 = Math.max(0, Math.min(1, (p - 0.333) * 3));
      const p3 = Math.max(0, Math.min(1, (p - 0.666) * 3));

      const dur1 = video1Duration && !isNaN(video1Duration) && video1Duration > 0 ? video1Duration : (v1.duration && !isNaN(v1.duration) && v1.duration > 0 ? v1.duration : 10);
      const dur2 = video2Duration && !isNaN(video2Duration) && video2Duration > 0 ? video2Duration : (v2.duration && !isNaN(v2.duration) && v2.duration > 0 ? v2.duration : 10);
      const dur3 = video3Duration && !isNaN(video3Duration) && video3Duration > 0 ? video3Duration : (v3.duration && !isNaN(v3.duration) && v3.duration > 0 ? v3.duration : 10);

      const targetTime1 = p1 * dur1;
      const targetTime2 = p2 * dur2;
      const targetTime3 = p3 * dur3;

      // Update Video 1 currentTime strictly when not seeking
      if (!v1.seeking && Math.abs(v1.currentTime - targetTime1) > 0.005) {
        v1.currentTime = Math.max(0, Math.min(targetTime1, dur1 - 0.01));
      }

      // Update Video 2 currentTime strictly when not seeking
      if (!v2.seeking && Math.abs(v2.currentTime - targetTime2) > 0.005) {
        v2.currentTime = Math.max(0, Math.min(targetTime2, dur2 - 0.01));
      }

      // Update Video 3 currentTime strictly when not seeking
      if (!v3.seeking && Math.abs(v3.currentTime - targetTime3) > 0.005) {
        v3.currentTime = Math.max(0, Math.min(targetTime3, dur3 - 0.01));
      }

      // Render updated frames on Canvas ONLY when fully decoded and finished seeking
      const activeVideo = p <= 0.333 ? v1 : p <= 0.666 ? v2 : v3;
      const lastTimeKey = p <= 0.333
        ? `v1_${v1.currentTime}`
        : p <= 0.666
          ? `v2_${v2.currentTime}`
          : `v3_${v3.currentTime}`;

      if (activeVideo.readyState >= 2 && !activeVideo.seeking && lastTimeRef.current !== lastTimeKey) {
        if (!isCanvasTainted) {
          drawFrame();
        }
        lastTimeRef.current = lastTimeKey;
      }

      rAF = requestAnimationFrame(tick);
    };

    rAF = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rAF);
    };
  }, [video1Duration, video2Duration, video3Duration, isCanvasTainted]);

  return (
    <div id="scroll-wrapper" ref={containerRef} className="relative w-full h-[500vh] bg-black">
      {/* Fixed Full Screen Stage */}
      <div id="video-stage" className="fixed inset-0 w-full h-full overflow-hidden flex items-center justify-center bg-black">
        
        {/* Bloom Brand Identity Header at Top Left */}
        <div ref={brandHeaderRef} className="premium-brand-header">
          <svg viewBox="0 0 49 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="premium-brand-logo-svg">
            <g clipPath="url(#clip0_1170_24)">
              <g clipPath="url(#clip1_1170_24)">
                <path d="M48.4404 17.6588C47.7017 15.3617 46.2569 13.3584 44.3131 11.9362C42.3693 10.5141 40.0265 9.74617 37.6207 9.74268H37.0462C37.1235 10.2805 37.164 10.8231 37.1676 11.3665C37.1628 14.3622 36.0924 17.2579 34.1489 19.5323C32.2054 21.8066 29.5166 23.3102 26.5664 23.7724C26.6392 24.0729 26.7121 24.3733 26.8092 24.6655C26.9904 25.2224 27.2122 25.7651 27.4728 26.2894C27.4728 26.2894 27.4728 26.2894 27.4728 26.3543C27.5942 26.5898 27.7236 26.8252 27.8612 27.0526L27.9178 27.15C28.3242 27.8128 28.796 28.433 29.3259 29.0011L29.5687 29.2609L29.9652 29.6263C30.0866 29.74 30.2161 29.8536 30.3537 29.9592L30.7098 30.2515C30.8797 30.3814 31.0577 30.5032 31.2358 30.625L31.5595 30.8523C31.8508 31.0309 32.1502 31.2095 32.4577 31.3638C33.787 32.0468 35.2378 32.4594 36.7266 32.5778C38.2154 32.6963 39.7129 32.5182 41.1329 32.0539C41.4083 31.9667 41.6785 31.8637 41.9421 31.7454C44.6033 30.6611 46.7546 28.6033 47.961 25.9882C49.1674 23.3731 49.3387 20.3958 48.4404 17.6588Z" fill="white"/>
                <path d="M41.4966 33.1341C40.2425 33.5456 38.9316 33.7566 37.6122 33.7593C35.2977 33.7531 33.0303 33.1034 31.0617 31.8822C29.0931 30.6611 27.5005 28.9163 26.4607 26.8418C26.1937 27.0042 25.9428 27.1747 25.6515 27.3614C25.1901 27.702 24.7546 28.0765 24.3486 28.4819L24.3 28.5306C24.1058 28.7173 23.9278 28.9122 23.7497 29.1151L23.685 29.1963C23.1783 29.7906 22.7336 30.4354 22.3578 31.1206C22.3012 31.2261 22.2445 31.3235 22.196 31.4291C22.1474 31.5346 22.0341 31.7538 21.9613 31.9162C21.8885 32.0786 21.8237 32.2329 21.7671 32.3952C21.7104 32.5576 21.6538 32.6794 21.6052 32.8256C21.5567 32.9717 21.4677 33.2315 21.411 33.4345C21.3544 33.6375 21.3382 33.6699 21.3139 33.7917C21.2236 34.1255 21.1534 34.4644 21.1035 34.8066C20.8672 36.2866 20.9251 37.7989 21.2737 39.2564C21.6223 40.7139 22.2548 42.0879 23.1347 43.2992C23.2966 43.5184 23.4746 43.7376 23.6526 43.9406C25.3534 46.0837 27.7685 47.5385 30.4534 48.0372C33.1384 48.045 35.9125 48.045 38.2653 46.6547C40.6181 45.2645 42.3913 43.0685 43.2586 40.4708C44.1259 37.8732 44.029 35.0487 42.9856 32.517C42.5042 32.7574 42.0067 32.9636 41.4966 33.1341Z" fill="white"/>
                <path d="M20.0045 34.6197C20.4175 31.9862 21.6629 29.5556 23.5571 27.686C23.3224 27.4912 23.0796 27.2882 22.8287 27.1096C21.2988 25.9892 19.5119 25.2743 17.6334 25.0311H17.3987C16.9941 24.9905 16.5894 24.958 16.1686 24.958C14.3714 24.962 12.6002 25.3895 10.9978 26.206C9.39542 27.0226 8.00658 28.2053 6.9432 29.659C6.78135 29.8863 6.63568 30.1217 6.49002 30.3572C5.03583 32.6434 4.4443 35.3759 4.82225 38.0613C5.2002 40.7467 6.52271 43.208 8.55098 45.0008C10.5793 46.7937 13.1796 47.7998 15.8825 47.8376C18.5854 47.8754 21.2127 46.9424 23.29 45.207C22.9121 44.8221 22.5632 44.4096 22.2461 43.9729C21.2738 42.6404 20.575 41.1275 20.1902 39.5219C19.8054 37.9163 19.7423 36.25 20.0045 34.6197Z" fill="white"/>
                <path d="M6.01393 28.9525C7.76739 26.527 10.3287 24.8119 13.234 24.1178C16.1392 23.4238 19.1961 23.7967 21.8509 25.169C21.9723 24.8848 22.0856 24.6006 22.1827 24.3002C22.7183 22.6659 22.8815 20.9318 22.6602 19.2258C22.6602 19.1446 22.6602 19.0634 22.6602 18.9903C22.6602 18.7955 22.5873 18.6006 22.5469 18.4139C22.5064 18.2271 22.4821 18.1054 22.4417 17.9592C22.4012 17.8131 22.3608 17.6426 22.3122 17.4802C22.2636 17.3178 22.1827 17.0905 22.118 16.8956C22.0532 16.7008 22.029 16.652 21.9804 16.5384C21.8586 16.2165 21.7181 15.902 21.5596 15.5966C20.8885 14.2565 19.9583 13.0639 18.8232 12.0881C17.6881 11.1124 16.3708 10.3731 14.948 9.91321C14.6972 9.83202 14.4544 9.76706 14.2035 9.71023C13.2994 9.47628 12.3696 9.35628 11.4359 9.35299C8.9636 9.30745 6.54433 10.0747 4.54726 11.5375C2.55019 13.0004 1.08498 15.0786 0.375205 17.4551C-0.334567 19.8315 -0.249922 22.3757 0.616224 24.6993C1.48237 27.023 3.08245 28.9986 5.17231 30.3246C5.42183 29.8488 5.70301 29.3904 6.01393 28.9525Z" fill="white"/>
                <path d="M22.5278 15.0688C23.735 17.4435 24.1546 20.143 23.7255 22.7738C24.025 22.7738 24.3325 22.8225 24.6481 22.8225C25.2227 22.8148 25.796 22.766 26.3637 22.6764C28.9618 22.273 31.3392 20.9756 33.0885 19.0065L33.2585 18.8198C33.4041 18.6493 33.5417 18.4707 33.6793 18.2839C33.8169 18.0972 33.833 18.0891 33.9059 17.9835C33.9787 17.878 34.1406 17.6425 34.2458 17.472C34.351 17.3015 34.4076 17.2122 34.4804 17.0823C34.5533 16.9524 34.6666 16.7575 34.7475 16.587C34.8284 16.4165 34.9013 16.2785 34.9741 16.1243C35.0469 15.97 35.1117 15.8076 35.1845 15.6452C35.2573 15.4829 35.314 15.2961 35.3706 15.1175C35.4273 14.9389 35.4839 14.8008 35.5325 14.6466C35.581 14.4923 35.6377 14.2488 35.6862 14.0458C35.7348 13.8428 35.7591 13.7535 35.7833 13.6073C35.8076 13.4612 35.8643 13.1364 35.8966 12.8929C35.929 12.6493 35.8966 12.6493 35.9452 12.5194C35.9452 12.154 36.0018 11.7887 36.0018 11.4071C36.0018 11.0255 36.0018 10.8387 36.0018 10.5952C35.8453 7.88465 34.727 5.31985 32.8491 3.36487C30.9712 1.40989 28.4579 0.193859 25.7639 -0.0631835C23.0699 -0.320226 20.3731 0.398699 18.1616 1.96351C15.9501 3.52831 14.37 5.83563 13.707 8.46797C14.2332 8.56239 14.7523 8.69259 15.2608 8.85768C16.8205 9.36099 18.2656 10.1689 19.5128 11.2349C20.76 12.3008 21.7847 13.6038 22.5278 15.0688Z" fill="white"/>
              </g>
            </g>
            <defs>
              <clipPath id="clip0_1170_24">
                <rect width="49" height="48" fill="white"/>
              </clipPath>
              <clipPath id="clip1_1170_24">
                <rect width="49" height="48" fill="white"/>
              </clipPath>
            </defs>
          </svg>
          <span className="premium-brand-text">
            Bloom
          </span>
        </div>

        {/* Premium Capsule Segments Navigation Header at Top Right */}
        <header ref={navHeaderRef} className="premium-header-nav">
          <nav className="premium-nav">
            <ul className="premium-nav-list">
              <li className="premium-nav-item">
                <a href="#atelier" className="premium-nav-link">Atelier</a>
              </li>
              <li className="premium-nav-item">
                <a href="#collections" className="premium-nav-link">Collections</a>
              </li>
              <li className="premium-nav-item">
                <a href="#rituals" className="premium-nav-link">Rituals</a>
              </li>
              <li className="premium-nav-item">
                <a href="#about" className="premium-nav-link">About</a>
              </li>
              <li className="premium-nav-item">
                <a href="#contact" className="premium-nav-link">Contact</a>
              </li>
            </ul>
          </nav>
        </header>

        {/* Dynamic Translucent Brand Card at Bottom Left */}
        <div ref={cardRef} className="premium-botanical-card">
          <h2 className="premium-card-title">
            Merging <span className="italic">Silicon</span> With Organic <span className="italic">Life.</span>
          </h2>
          <p className="premium-card-subtext">
            Developing Next-Generation Cyber-Botanical Systems Designed To Heal Ecosystems And Advance Human Tech.
          </p>
          <button 
            className="premium-action-circle" 
            title="Explore systems"
            aria-label="Explore systems"
            onClick={() => {
              window.scrollTo({
                top: window.innerHeight * 0.9,
                behavior: 'smooth'
              });
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 40 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M29.5 4.5L37 12m0 0l-7.5 7.5M37 12H3" />
            </svg>
          </button>
        </div>

        {/* Staggered Vertical Feature Cards at End of Scroll */}
        <div id="features-row" ref={featuresContainerRef} className="premium-features-container">
          {/* Card 1: Bio-Computing */}
          <div id="feature-card-1" ref={card1Ref} className="premium-feature-card">
            <div className="premium-feature-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <h3 className="premium-feature-title">Neural Synthesis</h3>
            <p className="premium-feature-desc">
              Hybrid bio-computing linking mycelium networks with logical silicon cores.
            </p>
          </div>

          {/* Card 2: Terra Healing */}
          <div id="feature-card-2" ref={card2Ref} className="premium-feature-card">
            <div className="premium-feature-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3m14.5-4.5l-11 11m11 0l-11-11" />
              </svg>
            </div>
            <h3 className="premium-feature-title">Ecosystem Remediation</h3>
            <p className="premium-feature-desc">
              Self-replicating biomechanical flora actively restoring and cleansing heavily toxic soil bases.
            </p>
          </div>

          {/* Card 3: Energy Symbiosis */}
          <div id="feature-card-3" ref={card3Ref} className="premium-feature-card">
            <div className="premium-feature-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 3L7 12h12l-6 9" />
              </svg>
            </div>
            <h3 className="premium-feature-title">Kinetic Transduction</h3>
            <p className="premium-feature-desc">
              Converting natural photosynthesis cycles into electrical energy for local grids.
            </p>
          </div>
        </div>

        {/* Company Mission Text Section */}
        <div 
          id="company-mission-overlay"
          ref={missionContainerRef}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 px-6 md:px-12"
          style={{ display: 'none' }}
        >
          <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
            
            {/* Paragraph 1 */}
            <div 
              ref={missionPara1Ref} 
              className="absolute text-center select-none pointer-events-none font-serif text-3xl md:text-5xl lg:text-6xl text-white/95 leading-snug tracking-tight"
              style={{ opacity: 0, transform: 'translate3d(0, 120px, 0)' }}
            >
              To gracefully cultivate a newly balanced <span className="inline-block px-4 md:px-6 py-0.5 md:py-1 mx-1.5 md:mx-2.5 bg-[#002AFF] text-white rounded-full align-middle font-serif">ecosystem</span> we dissolve all boundaries between technology and nature.
            </div>

            {/* Paragraph 2 */}
            <div 
              ref={missionPara2Ref} 
              className="absolute text-center select-none pointer-events-none font-serif text-3xl md:text-5xl lg:text-6xl text-white/95 leading-snug tracking-tight"
              style={{ opacity: 0, transform: 'translate3d(0, 120px, 0)' }}
            >
              By rewriting the biological code of our <span className="inline-block px-4 md:px-6 py-0.5 md:py-1 mx-1.5 md:mx-2.5 bg-[#002AFF] text-white rounded-full align-middle font-serif">planet</span> we employ specialized photosynthesis to heal broken landscapes.
            </div>

            {/* Paragraph 3 */}
            <div 
              ref={missionPara3Ref} 
              className="absolute text-center select-none pointer-events-none font-serif text-3xl md:text-5xl lg:text-6xl text-white/95 leading-snug tracking-tight"
              style={{ opacity: 0, transform: 'translate3d(0, 120px, 0)' }}
            >
              We believe that growing through botanical <span className="inline-block px-4 md:px-6 py-0.5 md:py-1 mx-1.5 md:mx-2.5 bg-[#002AFF] text-white rounded-full align-middle font-serif">symbiosis</span> is the ultimate pathway to power the future of humanity.
            </div>

          </div>
        </div>

        {/* Minimalist Feedback Form Overlay */}
        <div 
          id="scroll-feedback-overlay"
          ref={feedbackContainerRef}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 px-6 md:px-12"
          style={{ display: 'none' }}
        >
          <div 
            ref={feedbackFormRef}
            className="relative w-full max-w-md bg-black/45 backdrop-blur-2xl border border-white/10 p-8 md:p-12 text-center pointer-events-auto flex flex-col items-center justify-center transition-all duration-300 hover:border-white/20 select-none"
            style={{ opacity: 0, transform: 'translate3d(0, 120px, 0)' }}
          >
            {/* Brand Logo added above title */}
            <div className="w-12 h-12 mb-5 text-white flex items-center justify-center">
              <svg viewBox="0 0 49 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
                <g clipPath="url(#feedback_clip0)">
                  <g clipPath="url(#feedback_clip1)">
                    <path d="M48.4404 17.6588C47.7017 15.3617 46.2569 13.3584 44.3131 11.9362C42.3693 10.5141 40.0265 9.74617 37.6207 9.74268H37.0462C37.1235 10.2805 37.164 10.8231 37.1676 11.3665C37.1628 14.3622 36.0924 17.2579 34.1489 19.5323C32.2054 21.8066 29.5166 23.3102 26.5664 23.7724C26.6392 24.0729 26.7121 24.3733 26.8092 24.6655C26.9904 25.2224 27.2122 25.7651 27.4728 26.2894C27.4728 26.2894 27.4728 26.2894 27.4728 26.3543C27.5942 26.5898 27.7236 26.8252 27.8612 27.0526L27.9178 27.15C28.3242 27.8128 28.796 28.433 29.3259 29.0011L29.5687 29.2609L29.9652 29.6263C30.0866 29.74 30.2161 29.8536 30.3537 29.9592L30.7098 30.2515C30.8797 30.3814 31.0577 30.5032 31.2358 30.625L31.5595 30.8523C31.8508 31.0309 32.1502 31.2095 32.4577 31.3638C33.787 32.0468 35.2378 32.4594 36.7266 32.5778C38.2154 32.6963 39.7129 32.5182 41.1329 32.0539C41.4083 31.9667 41.6785 31.8637 41.9421 31.7454C44.6033 30.6611 46.7546 28.6033 47.961 25.9882C49.1674 23.3731 49.3387 20.3958 48.4404 17.6588Z" fill="white"/>
                    <path d="M41.4966 33.1341C40.2425 33.5456 38.9316 33.7566 37.6122 33.7593C35.2977 33.7531 33.0303 33.1034 31.0617 31.8822C29.0931 30.6611 27.5005 28.9163 26.4607 26.8418C26.1937 27.0042 25.9428 27.1747 25.6515 27.3614C25.1901 27.702 24.7546 28.0765 24.3486 28.4819L24.3 28.5306C24.1058 28.7173 23.9278 28.9122 23.7497 29.1151L23.685 29.1963C23.1783 29.7906 22.7336 30.4354 22.3578 31.1206C22.3012 31.2261 22.2445 31.3235 22.196 31.4291C22.1474 31.5346 22.0341 31.7538 21.9613 31.9162C21.8885 32.0786 21.8237 32.2329 21.7671 32.3952C21.7671 32.3952 21.7671 32.3952 21.7671 32.3952C21.7104 32.5576 21.6538 32.6794 21.6052 32.8256C21.5567 32.9717 21.4677 33.2315 21.411 33.4345C21.3544 33.6375 21.3382 33.6699 21.3139 33.7917C21.2236 34.1255 21.1534 34.4644 21.1035 34.8066C20.8672 36.2866 20.9251 37.7989 21.2737 39.2564C21.6223 40.7139 22.2548 42.0879 23.1347 43.2992C23.2966 43.5184 23.4746 43.7376 23.6526 43.9406C25.3534 46.0837 27.7685 47.5385 30.4534 48.0372C33.1384 48.045 35.9125 48.045 38.2653 46.6547C40.6181 45.2645 42.3913 43.0685 43.2586 40.4708C44.1259 37.8732 44.029 35.0487 42.9856 32.517C42.5042 32.7574 42.0067 32.9636 41.4966 33.1341Z" fill="white"/>
                    <path d="M20.0045 34.6197C20.4175 31.9862 21.6629 29.5556 23.5571 27.686C23.3224 27.4912 23.0796 27.2882 22.8287 27.1096C21.2988 25.9892 19.5119 25.2743 17.6334 25.0311H17.3987C16.9941 24.9905 16.5894 24.958 16.1686 24.958C14.3714 24.962 12.6002 25.3895 10.9978 26.206C9.39542 27.0226 8.00658 28.2053 6.9432 29.659C6.78135 29.8863 6.63568 30.1217 6.49002 30.3572C5.03583 32.6434 4.4443 35.3759 4.82225 38.0613C5.2002 40.7467 6.52271 43.208 8.55098 45.0008C10.5793 46.7937 13.1796 47.7998 15.8825 47.8376C18.5854 47.8754 21.2127 46.9424 23.29 45.207C22.9121 44.8221 22.5632 44.4096 22.2461 43.9729C21.2738 42.6404 20.575 41.1275 20.1902 39.5219C19.8054 37.9163 19.7423 36.25 20.0045 34.6197Z" fill="white"/>
                    <path d="M6.01393 28.9525C7.76739 26.527 10.3287 24.8119 13.234 24.1178C16.1392 23.4238 19.1961 23.7967 21.8509 25.169C21.9723 24.8848 22.0856 24.6006 22.1827 24.3002C22.7183 22.6659 22.8815 20.9318 22.6602 19.2258C22.6602 19.1446 22.6602 19.0634 22.6602 18.9903C22.6602 18.7955 22.5873 18.6006 22.5469 18.4139C22.5064 18.2271 22.4821 18.1054 22.4417 17.9592C22.4012 17.8131 22.3608 17.6426 22.3122 17.4802C22.2636 17.3178 22.1827 17.0905 22.118 16.8956C22.0532 16.7008 22.029 16.652 21.9804 16.5384C21.8586 16.2165 21.7181 15.902 21.5596 15.5966C20.8885 14.2565 19.9583 13.0639 18.8232 12.0881C17.6881 11.1124 16.3708 10.3731 14.948 9.91321C14.6972 9.83202 14.4544 9.76706 14.2035 9.71023C13.2994 9.47628 12.3696 9.35628 11.4359 9.35299C8.9636 9.30745 6.54433 10.0747 4.54726 11.5375C2.55019 13.0004 1.08498 15.0786 0.375205 17.4551C-0.334567 19.8315 -0.249922 22.3757 0.616224 24.6993C1.48237 27.023 3.08245 28.9986 5.17231 30.3246C5.42183 29.8488 5.70301 29.3904 6.01393 28.9525Z" fill="white"/>
                    <path d="M22.5278 15.0688C23.735 17.4435 24.1546 20.143 23.7255 22.7738C24.025 22.7738 24.3325 22.8225 24.6481 22.8225C25.2227 22.8148 25.796 22.766 26.3637 22.6764C28.9618 22.273 31.3392 20.9756 33.0885 19.0065L33.2585 18.8198C33.4041 18.6493 33.5417 18.4707 33.6793 18.2839C33.8169 18.0972 33.833 18.0891 33.9059 17.9835C33.9787 17.878 34.1406 17.6425 34.2458 17.472C34.351 17.3015 34.4076 17.2122 34.4804 17.0823C34.5533 16.9524 34.6666 16.7575 34.7475 16.587C34.8284 16.4165 34.9013 16.2785 34.9741 16.1243C35.0469 15.97 35.1117 15.8076 35.1845 15.6452C35.2573 15.4829 35.314 15.2961 35.3706 15.1175C35.2573 15.4829 35.314 15.2961 35.3706 15.1175C35.4273 14.9389 35.4839 14.8008 35.5325 14.6466C35.581 14.4923 35.6377 14.2488 35.6862 14.0458C35.7348 13.8428 35.7591 13.7535 35.7833 13.6073C35.8076 13.4612 35.8643 13.1364 35.8966 12.8929C35.929 12.6493 35.8966 12.6493 35.9452 12.5194C35.9452 12.154 36.0018 11.7887 36.0018 11.4071C36.0018 11.0255 36.0018 10.8387 36.0018 10.5952C35.8453 7.88465 34.727 5.31985 32.8491 3.36487C30.9712 1.40989 28.4579 0.193859 25.7639 -0.0631835C23.0699 -0.320226 20.3731 0.398699 18.1616 1.96351C15.9501 3.52831 14.37 5.83563 13.707 8.46797C14.2332 8.56239 14.7523 8.69259 15.2608 8.85768C16.8205 9.36099 18.2656 10.1689 19.5128 11.2349C20.76 12.3008 21.7847 13.6038 22.5278 15.0688Z" fill="white"/>
                  </g>
                </g>
                <defs>
                  <clipPath id="feedback_clip0">
                    <rect width="49" height="48" fill="white"/>
                  </clipPath>
                  <clipPath id="feedback_clip1">
                    <rect width="49" height="48" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>

            <h3 className="font-serif text-2xl md:text-3xl text-white font-normal tracking-tight mb-2 select-text leading-tight whitespace-nowrap">
              Cultivate alignment
            </h3>
            
            <p className="font-sans text-[10px] md:text-xs text-white/50 tracking-wider uppercase mb-7 max-w-xs leading-relaxed select-text">
              Subscribe to biological updates & cybernetic releases.
            </p>

            <form onSubmit={handleFeedbackSubmit} className="w-full flex flex-col gap-3.5 select-text">
              <div className="relative w-full">
                <input
                  type="email"
                  required
                  placeholder="name@ecosystem.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-3 md:py-4 bg-white/5 hover:bg-white/10 focus:bg-white/10 text-white placeholder-white/30 border border-white/10 focus:border-[#002AFF] focus:ring-0 text-sm md:text-base outline-none transition-all duration-300 font-sans tracking-wide text-center"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitted}
                className={`w-full py-3.5 md:py-4 px-6 text-xs font-semibold uppercase tracking-widest font-sans transition-all duration-300 active:scale-98 ${
                  isSubmitted 
                    ? 'bg-emerald-600 text-white cursor-default' 
                    : 'bg-[#002AFF] hover:bg-[#1e4dff] text-white cursor-pointer'
                }`}
              >
                {isSubmitted ? 'SUBMITTED' : 'CONNECT'}
              </button>
            </form>

            {isSubmitted && (
              <p className="mt-4 text-xs font-sans text-emerald-400 font-medium tracking-wide leading-relaxed animate-fade-in select-text">
                Welcome to the digital flora. Check your inbox soon.
              </p>
            )}
          </div>
        </div>

        {/* Parallax Video Background Container */}
        <div 
          ref={bgWrapperRef}
          className="absolute pointer-events-none select-none"
          style={{
            top: '-5%',
            left: '-5%',
            right: '-5%',
            bottom: '-5%',
            width: '110%',
            height: '110%',
            transform: 'translate3d(0px, 0px, 0px)',
            transition: 'transform 0.4s cubic-bezier(0.15, 0.85, 0.35, 1)'
          }}
        >
          {/* Triple video sources for seamless chronological scrubbing */}
          <video
            id="scroll-video-source-1"
            ref={videoRef1}
            src={videoSrc1}
            preload="auto"
            muted
            playsInline
            className={`absolute pointer-events-none w-full h-full object-cover transition-opacity duration-300 ${
              isCanvasTainted && currentProgressRef.current <= 0.333 
                ? 'opacity-100 block' 
                : isCanvasTainted 
                  ? 'opacity-0 hidden'
                  : 'opacity-0 w-0 h-0 hidden'
            }`}
            crossOrigin="anonymous"
          />

          <video
            id="scroll-video-source-2"
            ref={videoRef2}
            src={videoSrc2}
            preload="auto"
            muted
            playsInline
            className={`absolute pointer-events-none w-full h-full object-cover transition-opacity duration-300 ${
              isCanvasTainted && currentProgressRef.current > 0.333 && currentProgressRef.current <= 0.666
                ? 'opacity-100 block' 
                : isCanvasTainted 
                  ? 'opacity-0 hidden'
                  : 'opacity-0 w-0 h-0 hidden'
            }`}
            crossOrigin="anonymous"
          />

          <video
            id="scroll-video-source-3"
            ref={videoRef3}
            src={videoSrc3}
            preload="auto"
            muted
            playsInline
            className={`absolute pointer-events-none w-full h-full object-cover transition-opacity duration-300 ${
              isCanvasTainted && currentProgressRef.current > 0.666 
                ? 'opacity-100 block' 
                : isCanvasTainted 
                  ? 'opacity-0 hidden'
                  : 'opacity-0 w-0 h-0 hidden'
            }`}
            crossOrigin="anonymous"
          />

          {/* Optimized Canvas view layer */}
          {!isCanvasTainted && (
            <canvas
              id="render-canvas"
              ref={canvasRef}
              className="w-full h-full object-cover select-none pointer-events-none block"
            />
          )}
        </div>

        {/* Loading / Fallback Diagnostic overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              id="loader-screen"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 px-6 text-center"
            >
              <div className="relative flex items-center justify-center w-16 h-16 mb-4">
                {/* Minimalist modern loading indicator */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#1f2937"
                    strokeWidth="2"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#ffffff"
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray={176}
                    strokeDashoffset={176 - (176 * Math.max(loadingProgress, 5)) / 100}
                    transition={{ ease: 'easeOut' }}
                  />
                </svg>
                <span className="absolute text-xs font-mono text-gray-400">
                  {loadingProgress}%
                </span>
              </div>
              <p className="text-sm font-mono tracking-widest text-gray-500 uppercase animate-pulse">
                Pre-decoding video pipeline
              </p>
            </motion.div>
          )}

          {hasError && (
            <motion.div
              id="error-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black z-40 p-6 text-center"
            >
              <div className="p-4 border border-gray-800 rounded bg-zinc-950 max-w-md">
                <p className="text-red-500 font-mono text-sm mb-2">▼ Decryption / Quota Error</p>
                <p className="text-xs text-gray-400 leading-relaxed font-mono">
                  Unable to buffer resources from the video host pipeline. Please ensure the target sharing permissions allow anonymous range requests or try reloading.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </div>
    </div>
  );
}
