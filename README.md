# javascript-unzip
A javascript function to decompress zip content. The inflate algorithm is optimized for performance.
##usage
unzip(file, success, error)
- file: a File/Blob (see index.html) or a ArrayBuffer instance
- success: callback function(entries) { ... } // entries: entry map by name
- error: callback function(errorText) { ... } // errorText: error description if unzip fails

##Entry
A single entry object has the following properties:
- name: the zip entry name, i.e. the file path

and the following methods:
- toString(): returns the content of the entry as a String
- toBlob(): returns the content of the entry as a Blob
- toXML(): returns the content of the entry as a DOM Document
- toUint8Array(): returns the content of the entry as a Uint8Array
