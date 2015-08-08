var unzip;

(function() {

	var bitmask = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
	var lengths = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
	var lengthsExtra = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
	var dists = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
	var distsExtra = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
	var order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
	var hlitMap, hdistMap;
	var fixHlitMap = {
		bls: [7,8,9],
		"7": {},
		"8": {},
		"9": {}
	}; 
	var fixHdistMap = {
		bls: [5],
		"5": {}
	};
	var code = 0;
	for (var i = 256; i <= 279; i++) {
		fixHlitMap[7][code++] = i;
	}
	code <<= 1;
	for (var i = 0; i <= 143; i++) {
		fixHlitMap[8][code++] = i;
	}
	for (var i = 280; i <= 287; i++) {
		fixHlitMap[8][code++] = i;
	}
	code <<= 1;
	for (var i = 144; i <= 255; i++) {
		fixHlitMap[9][code++] = i;
	}
	var code = 0;
	for (var i = 0; i <= 29; i++) {
		fixHdistMap[5][code++] = i;
	}

	function getCodeMap(lengths) {
		var blCount = [];
		var map = {};
		for (var i = 0; i < lengths.length; i++) {
			var len = lengths[i];
			if (len) {
				blCount[len] = (blCount[len] || 0) + 1;
			}
		}
		var code = 0;
		var nextCode = [];
		map.bls = [];
		for (var bl = 1; bl < blCount.length; bl++) {
			if (blCount[bl]) {
				map.bls.push(bl);
			}
			code = (code + (blCount[bl-1] || 0)) << 1;
			nextCode[bl] = code;
		}
		for (var i = 0; i < lengths.length; i++) {
			var len = lengths[i];
			if (len) {
				if (!map[len]) {
					map[len] = {};
				}
				map[len][nextCode[len]++] = i;
			}
		}
		return map;
	}

	function inflate(data, out) {
		var read = 0;
		var bit = 0;
		var byte = data[read++];
		var write = 0;
		function getBit() {
			var val = byte & bitmask[bit++];
			if (bit === 8) {
				bit = 0;
				byte = data[read++];
			}
			return val;
		}
		function getBits(n) {
			var val = 0;
			for (var i = 0; i < n; i++) {
				if (getBit()) val += bitmask[i];
			}
			return val;
		}
		function inflateCharacter(map) {
			var len = 0;
			var code = 0;
			for (var i = 0; i < map.bls.length; i++) {
				var bl = map.bls[i];
				while (len < bl) {
					code = (code << 1) + (getBit() ? 1 : 0);
					len++;
				}
				var val = map[bl][code];
				if (val !== undefined) return val;
			}
			throw "invalid code";
		}
		function getAlphabetMaps() {
			var hlit = getBits(5) + 257;
			var hdist = getBits(5) + 1;
			var hclen = getBits(4) + 4;
			var hclens = [];
			for (var i = 0; i < hclen; i++) {
				hclens[order[i]] = getBits(3);
			}
			var hclenMap = getCodeMap(hclens);
			var hs = [];
			var lastCl = 0;
			while (hs.length < hlit + hdist) {
				var cl = inflateCharacter(hclenMap);
				switch (cl) {
				case 16:
					var len = getBits(2) + 3;
					for (var j = 0; j < len; j++) {
						hs.push(lastCl);
					}
					break;
				case 17:
					var len = getBits(3) + 3;
					for (var j = 0; j < len; j++) {
						hs.push(0);
					}
					lastCl = 0;
					break;
				case 18:
					var len = getBits(7) + 11;
					for (var j = 0; j < len; j++) {
						hs.push(0);
					}
					lastCl = 0;
					break;
				default:
					hs.push(cl);
					lastCl = cl;
					break;
				}
			}
			hlitMap = getCodeMap(hs.slice(0, hlit));
			hdistMap = getCodeMap(hs.slice(hlit));
		}
		function inflateBlock() {
			for (;;) {
				var code = inflateCharacter(hlitMap);
				if (code < 256) {
					out[write++] = code;
				} else if (code === 256) {
					break;
				} else {
					var length = lengths[code - 257] + getBits(lengthsExtra[code - 257]);
					code = inflateCharacter(hdistMap);
					var dist = dists[code] + getBits(distsExtra[code]);
					if (length > dist) {
						var src = out.subarray(write - dist, write);
						while (length) {
							if (length >= dist) {
								out.set(src, write);
								write += dist;
								length -= dist;
							} else {
								out.set(src.subarray(0, length), write);
								write += length;
								break;
							}
						}
					} else {
						out.set(out.subarray(write - dist, write - dist + length), write);
						write += length;
					}
				}
			}
		}
		do {
			var bfinal = getBit();
			var btype = getBits(2);
			switch (btype) {
			case 0:
				//no compression
				var len = data[read] + (data[read + 1] << 8);
				read += 4;
				out.set(data.subarray(read, read + len), write);
				read += len;
				bit = 0;
				write += len;
				break;
			case 1:
				//fix
				hlitMap = fixHlitMap;
				hdistMap = fixHdistMap;
				inflateBlock();
				break;
			case 2:
				//dyn
				getAlphabetMaps();
				inflateBlock();
				break;
			default:
				throw "Bad btype: " + btype;
			}
		} while (!bfinal);
		return out;
	}

	function stringFromArray(array) {
		return decodeURIComponent(escape(String.fromCharCode.apply(null, array)));
	}
	
  function Entry() {}
  
  Entry.prototype.toUint8Array = function() {
		switch (this.compression) {
		case 0:
			return this.data;
		case 8:
			return inflate(this.data, new Uint8Array(this.length));
		default:
			throw "Unknown compression: " + this.compression;
		}
  };
  
  Entry.prototype.toString = function() {
		return stringFromArray(this.toUint8Array());
  };
  
  Entry.prototype.toXML = function() {
		var parser = new DOMParser();
		return parser.parseFromString(this.toString(), "application/xml");
  };
  
  Entry.prototype.toBlob = function() {
    return new Blob([this.toUint8Array().buffer]);
  };
  
  function unzipArrayBuffer(arraybuffer, success, error) {
		try {
			var data = new DataView(arraybuffer);
			var offset = 0;
			function getUint32() {
				var val = data.getUint32(offset, true);
				offset += 4;
				return val;
			}
			function getUint16() {
				var val = data.getUint16(offset, true);
				offset += 2;
				return val;
			}
			function getEntry() {
				if (getUint32() !== 0x02014b50) {
					throw "No central directory file header";
				}
				var entry = new Entry();
				offset += 6;
				entry.compression = getUint16();
				offset += 8;
				var length = getUint32();
				entry.length = getUint32();
				var nameLength = getUint16();
				var extraLength = getUint16();
				var commentLength = getUint16();
				offset += 8;
				var headerOffset = getUint32();
				entry.name = stringFromArray(new Uint8Array(arraybuffer, offset, nameLength));
				var nextEntryIndex = offset + nameLength + extraLength + commentLength;
				offset = headerOffset;
				if (getUint32() !== 0x04034b50) {
					throw "No local file header";
				}
				offset += 22;
				nameLength = getUint16();
				extraLength = getUint16();
				entry.data = new Uint8Array(arraybuffer, offset + nameLength + extraLength, length);
				offset = nextEntryIndex;
				return entry;
			}
			for (var start = arraybuffer.byteLength - 22; start > 0; start--) {
				offset = start;
				if (getUint32() === 0x06054b50) {
					offset += 6;
					var count = getUint16();
					offset += 4;
					offset = getUint32();
					var entries = {};
					for (var i = 0; i < count; i++) {
						var entry = getEntry();
						entries[entry.name] = entry;
					}
					success(entries);
					return;
				}
			}
			error("No zip file");
		} catch (e) {
			error(e.message || e);
		}
  }
  
  unzip = function(arraybufferOrBlob, success, error) {
		try {
      if (arraybufferOrBlob instanceof Blob) {
  			var r = new FileReader();
  			r.onloadend = function(e) {
  				if (r.error) {
  					error(r.error.name);
  				} else {
            unzipArrayBuffer(r.result, success, error);
  				}
  			}
  			r.readAsArrayBuffer(arraybufferOrBlob);
      } else {
        unzipArrayBuffer(arraybufferOrBlob, success, error);
      }
		} catch (e) {
			error(e.message || e);
		}
  };
  
})();

