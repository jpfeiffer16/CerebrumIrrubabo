/* global CodeMirror */
/* global chrome */
/* global CerebrumIrrumabo */
/* global $ */
/* global angular */


angular.module('app', ['ui.layout', 'customDirectives'])
	.controller('MainCtrl', function($scope) {
		this.input = '';
		var that = this;
		
		this.loadedFileName = '';
		this.currentFileName = '';
		this.saved = true;
		
		this.consoleClass = '';
		this.debugClass = 'hidden';
		
		var engineIsDirty = true;
		
		//Set up the editor
		var container = document.getElementById('editor-area');
		var editor = CodeMirror(container, {
			mode: 'bfmode',
			lineWrapping: true,
			matchBrackets: true,
			autoCloseBrackets: true
		});
		//Set up shorcuts
		editor.setOption('extraKeys', {
			'Ctrl-S': function () {
				that.saveFile(that.fileEntry);
			},
			'Ctrl-O': function () {
				that.openFile();
			},
			'Ctrl-R': function() {
				that.run(that.input, editor.getValue());
				$scope.$apply();
			},
			'Ctrl-B': function() {
				//Get the selection point
				var pos = editor.indexFromPos(editor.getCursor());
				that.addBreakpoint(pos);
			}
		});
		
		//Listen for changes:
		editor.on('change', function(instance, change) {
			if (that.saved && change.origin != 'setValue') {
				console.log(change);
				that.currentFileName += '*';
				that.saved = false;
				$scope.$apply();
			} else if (change.origin == 'setValue' && that.saved == false) {
				that.saved = true;
			}
		});
		
		
		
		this.addBreakpoint = function(index) {
			//Highlight text and add breakpoint
			console.log(index);
			var markStart = editor.posFromIndex(index);
			var markEnd = {
				line: markStart.line,
				ch: markStart.ch + 1
			}
			console.log(markStart, markEnd);
			editor.markText(markStart, markEnd, {
				className: 'debug-breakpoint'
			});
			//Add breakpoint
			runner.addBreakpoint(index);
		};
		
		
		this.code = function() {return editor.getValue();};
		
		this.results = [];
		
		//Set up the CerebrumIrrumabo Instance
		this.pointerLen = 200;//TODO: Add a binding for this on the front end
		var runner = new CerebrumIrrumabo('', '', this.pointerLen);
		this.runner = runner;
		this.debugObject = runner.debugObject;//TODO this needs looking at
		
		$scope.$watch('debugObject', function() {
			console.log(that.debugObject);
		});
		this.run = function (input, code) {
			if (engineIsDirty) {
				runner.debug = true;//TODO This needs to be based off of a setting of some type
				runner.code = code;
				runner.input = input;
				// runner.reset();//TODO This needs to be re-addressed
			}
			try {
				var test = runner.run();
				if (test.endOfCode) {
					this.results.push(test.output + '\n');
					engineIsDirty = true;
				} else {
					this.debugObject = test;
				}
				console.log(test);
			} catch (e) {
				this.results.push('Error: ' + e);
			}
		};
		
		this.step = function() {
			var stepVal = runner.step();
			if (!stepVal.endOfCode) {
				that.debugObject = stepVal;
			} else {
				that.results.push(stepVal.output);
			}
		};
		
		this.openFile = function() {
			chrome.fileSystem.chooseEntry({type: 'openWritableFile'}, function(entry) {
				that.fileEntry = entry;
				if (entry) {
					entry.file(function(file) {
						var fileReader = new FileReader();
						
						fileReader.onload = function(e) {
							that.currentFileName = file.name;
							that.loadedFileName = file.name;
							editor.setValue(e.target.result);
							$scope.$apply();
							//Save the last loaded file to localStorage   TODO: Fix this, it's not freakin working
							chrome.storage.local.set({lastLoaded: entry.fullPath});
						};
						
						fileReader.readAsText(file);
					});
				}
			});
		};
		
		this.saveFile = function(entry) {
			if (entry) {
				entry.createWriter(function(fileWriter) {
					fileWriter.onerror = function(e) {
				      console.log("Write failed: " + e.toString());
				    };
					var blob = new Blob([editor.getValue()], {type: "text/plain"});
					
					fileWriter.onwriteend = function() {
						fileWriter.onwriteend = function () {
							that.saved = true;
							that.currentFileName = that.loadedFileName;
							$scope.$apply();
							console.log('File Saved');
						}
						fileWriter.write(blob);//If this doesn't error, we can assume it's saved
						
					};
					fileWriter.truncate(editor.getValue().length);
				});
			} else {
				throw 'File was not saved';
			}
		};
		
		this.fromCharCode = function(charCode) {
			if (charCode) {
				return String.fromCharCode(charCode);
			} else {
				return null;
			}
		}
		
		this.toggleConsoleArea = function(panelToShow) {
			if (panelToShow == 'console') {
				this.consoleClass = '';
				this.debugClass = 'hidden';
			} else {
				this.consoleClass = 'hidden';
				this.debugClass = '';
			}
		};
		
		this.reset = function() {
			runner.reset();
		};
		
		//Init:
		//TODO: Fix this as well since, you guessed it, it's not fffffinng working either....
		chrome.storage.local.get('lastLoaded', function(result) {
			chrome.fileSystem.getFile(result.lastLoaded.toString(), function (entry) {
				console.log(entry);
			});
			console.log(result.lastLoaded.toString());
		});
		
	});