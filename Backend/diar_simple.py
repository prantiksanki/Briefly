# speaker diarization model yet to be trained
import os, math, struct, wave
import numpy as np
import soundfile as sf
import librosa
import webrtcvad
from sklearn.cluster import SpectralClustering
from pathlib import Path
from datetime import timedelta

# --- utils
def sec2ts(s):
    td = timedelta(seconds=float(s))
    ms = int((float(s) - int(float(s))) * 1000)
    return f"{str(td)[:-3] if '.' in str(td) else str(td)},{ms:03d}"

def write_rttm(segs, out_p):
    with open(out_p, "w") as f:
        for st, et, lab in segs:
            du = et - st
            f.write(f"SPEAKER file 1 {st:.3f} {du:.3f} <NA> <NA> spk{lab} <NA> <NA>\n")

def write_srt(segs, out_p):
    with open(out_p, "w") as f:
        for i, (st, et, lab) in enumerate(segs, 1):
            f.write(f"{i}\n{sec2ts(st)} --> {sec2ts(et)}\nspk{lab}\n\n")

# --- audio helpers
def to_pcm16(x):
    x = np.clip(x, -1, 1)
    y = (x * 32767).astype(np.int16)
    return y.tobytes()

def wav_to_pcm16_bytes(y, sr):
    # webrtcvad needs 16k mono 16-bit PCM frames
    if sr != 16000:
        y = librosa.resample(y, orig_sr=sr, target_sr=16000)
        sr = 16000
    if y.ndim > 1:
        y = np.mean(y, axis=0)
    return to_pcm16(y), sr

def frame_bytes(buf, sr=16000, ms=30):
    n = int(sr * ms / 1000) * 2  # 2 bytes per sample
    for i in range(0, len(buf), n):
        b = buf[i:i+n]
        if len(b) == n:
            yield b

# --- VAD
def vad_seg(y, sr, agg=2, win_ms=30, min_s=0.3, pad_ms=150):
    pb, sr = wav_to_pcm16_bytes(y, sr)
    vad = webrtcvad.Vad(agg)  # 0-3 (3=aggressive)
    fm = list(frame_bytes(pb, sr, win_ms))
    fs = int(sr * win_ms / 1000)
    lbl = np.array([1 if vad.is_speech(f, sr) else 0 for f in fm])
    # merge into segments
    segs = []
    i = 0
    pad = int(pad_ms / win_ms)
    while i < len(lbl):
        if lbl[i] == 1:
            j = i
            while j < len(lbl) and lbl[j] == 1:
                j += 1
            st = i * fs / sr
            et = j * fs / sr
            # pad
            st = max(0, st - pad*fs/sr)
            et = et + pad*fs/sr
            if et - st >= min_s:
                segs.append((st, et))
            i = j
        else:
            i += 1
    return segs

# --- feat
def seg_feats(y, sr, segs, hop=0.5, win=1.0, n_mfcc=20):
    X = []
    T = []
    for st, et in segs:
        t = st
        while t + win <= et:
            s = int(t * sr)
            e = int((t + win) * sr)
            yse = y[s:e]
            if len(yse) < int(win*sr):
                break
            mf = librosa.feature.mfcc(y=yse, sr=sr, n_mfcc=n_mfcc)
            stt = librosa.feature.spectral_contrast(y=yse, sr=sr)
            zcr = librosa.feature.zero_crossing_rate(yse)
            v = np.concatenate([mf.mean(1), mf.std(1), stt.mean(1), zcr.mean(1)])
            X.append(v)
            T.append((t, t+win))
            t += hop
    X = np.array(X) if len(X) else np.zeros((0, n_mfcc*2+stt.shape[0]+1))
    return X, T

# --- cluster
def est_k(X, k_min=2, k_max=8):
    if len(X) < k_min:
        return 1
    # simple eigengap on affinity of cosine sim
    from sklearn.metrics.pairwise import cosine_similarity
    A = cosine_similarity(X)
    L = np.diag(A.sum(1)) - A
    w = np.linalg.eigvalsh(L)
    w = np.sort(w)
    gaps = np.diff(w[:k_max+1])  # small to big
    k = np.argmax(gaps[k_min-1:]) + k_min
    return int(np.clip(k, k_min, k_max))

def cluster(X, k=None):
    from sklearn.metrics.pairwise import cosine_similarity
    if len(X) == 0:
        return np.array([])
    A = cosine_similarity(X)
    if k is None:
        k = est_k(X)
    sc = SpectralClustering(n_clusters=k, affinity='precomputed', assign_labels='discretize', random_state=0)
    lab = sc.fit_predict(A)
    return lab

# --- collapse windows to segments per spk
def win2seg(T, lab, merge_gap=0.6):
    segs = []
    if len(T) == 0:
        return segs
    cur_s, cur_e, cur_l = T[0][0], T[0][1], lab[0]
    for (st, et), l in zip(T[1:], lab[1:]):
        if l == cur_l and st - cur_e <= merge_gap:
            cur_e = et
        else:
            segs.append((cur_s, cur_e, int(cur_l)))
            cur_s, cur_e, cur_l = st, et, l
    segs.append((cur_s, cur_e, int(cur_l)))
    return segs

# --- main
def run(in_wav, out_dir="out_simple", vad_aggr=2):
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    y, sr = librosa.load(in_wav, sr=16000, mono=True)
    vs = vad_seg(y, sr, agg=vad_aggr)
    X, T = seg_feats(y, sr, vs)
    lab = cluster(X)
    segs = win2seg(T, lab)
    rttm_p = str(Path(out_dir)/"out.rttm")
    srt_p = str(Path(out_dir)/"out.srt")
    write_rttm(segs, rttm_p)
    write_srt(segs, srt_p)
    print("done:", rttm_p, srt_p)

if __name__ == "__main__":
    WAV = "file.wav"
    run(WAV)
