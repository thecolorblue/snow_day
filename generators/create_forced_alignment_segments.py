import os
import torch
from ctc_forced_aligner import (
    load_audio,
    load_alignment_model,
    generate_emissions,
    preprocess_text,
    get_alignments,
    get_spans,
    postprocess_results,
)
import torchaudio

STORY_ID = 107
SAMPLING_FREQ = 16000

audio_path = f"./forced_alignment/story_audio_{STORY_ID}.wav"
text_path = f"./forced_alignment/story_text_{STORY_ID}.txt"
language = "iso" # ISO-639-3 Language code
device = "cuda" if torch.cuda.is_available() else "cpu"
batch_size = 16

# ctc-forced-aligner --audio_path "forced_alignment/story_audio_107.wav" --text_path "forced_alignment/story_audio_107.txt" --language "eng" --romanize
# echogarden align story_audio_103.mp3 story_text_103.txt story_text_103.srt story_text_103.json
alignment_model, alignment_tokenizer = load_alignment_model(
    device,
    dtype=torch.float16 if device == "cuda" else torch.float32,
)

# check if the file exists
if not os.path.exists(audio_path):
    raise FileNotFoundError(f"Audio file not found: {audio_path}")

def local_load_audio(audio_file: str, dtype: torch.dtype, device: str):
    waveform, audio_sf = torchaudio.load(audio_file)  # waveform: channels X T
    waveform = torch.mean(waveform, dim=0)

    if audio_sf != SAMPLING_FREQ:
        waveform = torchaudio.functional.resample(
            waveform, orig_freq=audio_sf, new_freq=SAMPLING_FREQ
        )
    waveform = waveform.to(dtype).to(device)
    return waveform

audio_waveform = local_load_audio(audio_path, alignment_model.dtype, alignment_model.device)

print('waveform loaded')

with open(text_path, "r") as f:
    lines = f.readlines()
text = "".join(line for line in lines).replace("\n", " ").strip()

print('text loaded')

emissions, stride = generate_emissions(
    alignment_model, audio_waveform, batch_size=batch_size
)

print('emissions generated')

tokens_starred, text_starred = preprocess_text(
    text,
    romanize=True,
    language=language,
)

print('text preprocessed')

segments, scores, blank_token = get_alignments(
    emissions,
    tokens_starred,
    alignment_tokenizer,
)

print('alignments generated')

spans = get_spans(tokens_starred, segments, blank_token)

word_timestamps = postprocess_results(text_starred, spans, stride, scores)

print(f"Generated {len(word_timestamps)} wordtimestamps")