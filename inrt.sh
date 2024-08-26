#!/bin/sh

# The following optional environment variables are honored:
# INRT_DEBUG: boolean
# INRT_QUIET: boolean
# INRT_VERSION: string (default "v20240727.0")
# INRT_INSTALL_PATH: string (default "$HOME/.local/bin/inrt")

# This script is a derivative of https://github.com/jdx/mise/blob/main/packaging/standalone/install.envsubst
# which, at the time this derivative work was created, was licensed under the following terms:
# MIT License

# Copyright (c) 2024 Jeff Dickey

# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:

# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

set -eu

#region logging setup
if [ "${INRT_DEBUG-}" = "true" ] || [ "${INRT_DEBUG-}" = "1" ]; then
	debug() {
		echo "$@" >&2
	}
else
	debug() {
		:
	}
fi

if [ "${INRT_QUIET-}" = "1" ] || [ "${INRT_QUIET-}" = "true" ]; then
	info() {
		:
	}
else
	info() {
		echo "$@" >&2
	}
fi

error() {
	echo "$@" >&2
	exit 1
}
#endregion

#region environment setup
get_os() {
	os="$(uname -s)"
	if [ "$os" = Darwin ]; then
		echo "macos"
	elif [ "$os" = Linux ]; then
		echo "linux"
	else
		error "unsupported OS: $os"
	fi
}

get_arch() {
	musl=""
	if type ldd >/dev/null 2>/dev/null; then
		libc=$(ldd /bin/ls | grep 'musl' | head -1 | cut -d ' ' -f1)
		if [ -n "$libc" ]; then
			musl="-musl"
		fi
	fi
	arch="$(uname -m)"
	if [ "$arch" = x86_64 ]; then
		echo "x64$musl"
	elif [ "$arch" = aarch64 ] || [ "$arch" = arm64 ]; then
		echo "arm64$musl"
	elif [ "$arch" = armv7l ]; then
		echo "armv7$musl"
	else
		error "unsupported architecture: $arch"
	fi
}
#endregion

download_file() {
	url="$1"
	filename="$(basename "$url")"
	cache_dir="$(mktemp -d)"
	file="$cache_dir/$filename"

	info "inrt: installing inrt..."

	if command -v curl >/dev/null 2>&1; then
		debug ">" curl -#fLo "$file" "$url"
		curl -#fLo "$file" "$url"
	else
		if command -v wget >/dev/null 2>&1; then
			debug ">" wget -qO "$file" "$url"
			stderr=$(mktemp)
			wget -O "$file" "$url" >"$stderr" 2>&1 || error "wget failed: $(cat "$stderr")"
		else
			error "inrt install script requires curl or wget but neither is installed. Aborting."
		fi
	fi

	echo "$file"
}

install_inrt() {
	os="$(get_os)"
	arch="$(get_arch)"
	install_path="${INRT_INSTALL_PATH:-$HOME/.local/bin/inrt}"
	install_dir="$(dirname "$install_path")"

	# if INRT_VERSION is not set, then we download the latest release
	if [ -z ${INRT_VERSION:-""} ]; then
		zip_url="https://github.com/opswalrus/inrt/releases/latest/download/inrt-${os}-${arch}.zip"
	else
		version="${INRT_VERSION}"
		zip_url="https://github.com/opswalrus/inrt/releases/download/${version}/inrt-${os}-${arch}.zip"
	fi

	# version="${INRT_VERSION}"
	# os="$(get_os)"
	# arch="$(get_arch)"
	# install_path="${INRT_INSTALL_PATH:-$HOME/.local/bin/inrt}"
	# install_dir="$(dirname "$install_path")"
	# zip_url="https://github.com/opswalrus/inrt/releases/download/${version}/inrt-${os}-${arch}.zip"

	debug "inrt-setup: zip_url=$zip_url"

	cache_file=$(download_file "$zip_url")
	debug "inrt-setup: zip=$cache_file"

	# extract zip
	mkdir -p "$install_dir"
	rm -rf "$install_path"
	cd "$(mktemp -d)"
	unzip "$cache_file"
	mv "inrt-${os}-${arch}" "$install_path"
	info "inrt: installed successfully to $install_path"
}

install_inrt
