"""Regenerate the figures for the 'Line Drawings with FFT' write-up.

Adapted from github.com/PhilippeGuyard/rudolph (main.py): same edge
detection and FFT reconstruction, but the outputs are saved to assets/
instead of shown, and styled to sit on the site's cream background.
"""

import logging
from pathlib import Path

import cv2
import imageio
import matplotlib.pyplot as plt
import numpy as np

logging.basicConfig(level=logging.INFO)

HERE = Path(__file__).parent
ASSETS = HERE / "assets"
ASSETS.mkdir(exist_ok=True)

PAPER = "#fbf3e9"
# Source: "Doctor reindeer" by Snowflakes, CC0 (Pixabay / Wikimedia Commons).
# The committed original.png IS this image; we read it back, flatten any
# transparency onto white, and downscale before edge detection.
SOURCE = ASSETS / "original.png"
MAX_DIM = 1000


def load_and_process_image():
    image = cv2.imread(str(SOURCE), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise FileNotFoundError(f"Source image not found: {SOURCE}")
    if image.ndim == 3 and image.shape[2] == 4:      # flatten RGBA onto white
        alpha = image[:, :, 3:4] / 255.0
        image = (image[:, :, :3] * alpha + 255 * (1 - alpha)).astype(np.uint8)
    scale = MAX_DIM / max(image.shape[:2])
    if scale < 1:
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    edges = cv2.Canny(gray, 100, 200)
    return image, edges


def perform_fft_transformation(coords, n_components):
    fft_result = np.fft.fft(coords)
    fft_reconstruct = np.zeros_like(fft_result)
    fft_reconstruct[:n_components] = fft_result[:n_components]
    fft_reconstruct[-n_components:] = fft_result[-n_components:]
    return np.fft.ifft(fft_reconstruct)


def filter_valid_coords(x, y, shape):
    valid = (x >= 0) & (x < shape[1]) & (y >= 0) & (y < shape[0])
    return x[valid], y[valid]


def render(coords, n_components, dims):
    recon = perform_fft_transformation(coords, n_components)
    x = np.real(recon).astype(int)
    y = np.imag(recon).astype(int)
    x, y = filter_valid_coords(x, y, dims)
    img = np.zeros(dims, dtype=np.uint8)
    img[y, x] = 255
    return img


def main():
    _, edges = load_and_process_image()

    y, x = np.where(edges == 255)
    coords = x + 1j * y
    n = len(coords)

    # component counts to show, spanning the real signal: a coarse sweep,
    # then the drawing filling back in, scaled to however many edge pixels
    # this particular image produced
    counts = [64, round(n * 0.08), round(n * 0.22), round(n * 0.5), n]

    fig, axes = plt.subplots(2, 3, figsize=(15, 10), facecolor=PAPER)
    axes = axes.ravel()
    axes[0].imshow(255 - edges, cmap="gray")   # dark ink on light paper
    axes[0].set_title("Edges from the photo", color="#2c1b3d", fontsize=15)
    for ax, c in zip(axes[1:], counts):
        label = f"{c} components" if c < n else f"all {c} components"
        ax.imshow(255 - render(coords, c, edges.shape), cmap="gray")
        ax.set_title(label, color="#2c1b3d", fontsize=15)
    for ax in axes:
        ax.set_facecolor(PAPER)
        ax.axis("off")
    fig.tight_layout()
    fig.savefig(ASSETS / "reconstructions.png", dpi=110, facecolor=PAPER, bbox_inches="tight")
    logging.info("saved reconstructions.png")

    # animated build-up: keep every step so the gif is smooth
    n_steps = 120
    frames = []
    for i in range(1, n_steps + 1):
        c = max(1, int(i * (n / n_steps)))
        img = render(coords, c, edges.shape)
        # invert so the drawing is dark ink on light paper
        frames.append(255 - img)
    # duration is per-frame milliseconds in imageio >= 2.28
    imageio.mimsave(ASSETS / "animated_from_fft.gif", frames, duration=70, loop=0)
    logging.info("saved animated_from_fft.gif")


if __name__ == "__main__":
    main()
