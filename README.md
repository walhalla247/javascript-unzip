# javascript-unzip
A javascript function to decompress zip content. The inflate algorithm is optimized for performance.
##usage
unzip(file, success, error)
- file: a File/Blob (see index.html) or a ArrayBuffer instance
- success: callback function(entries) { ... } // entries: entry map by name
- error: callback function(errorText) { ... } // errorText: error description if unzip fails

##Entry objects
A single entry object has the following properties:
- name: the zip entry name, i.e. the file path

and the following methods:
- toString(): returns the content of the entry as a String
- toBlob(): returns the content of the entry as a Blob
- toXML(): returns the content of the entry as a DOM Document
- toUint8Array(): returns the content of the entry as a Uint8Array

##Example
	function success(entries) {
		//traverse entries by name
		for (var name in entries) {
			console.log("Found entry: " + name);
		}
		//access single entry
		var entry = entries["test.txt"];
		//decompress text
		var text = entry.toString();
	}

	function error(errorText) {
		alert("An error occured: " + errorText);
	}

	unzip(file, success, error); // file from input e.g.

##About
This javascript function was written by Alexander Schönberg walhalla247@gmail.com as part of a ebook speed reader for a Firefox OS App. Thanks to Tobias Röding, who inspired me to publish this tool to github.
