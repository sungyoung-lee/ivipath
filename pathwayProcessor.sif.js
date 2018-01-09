pidProcessor = function(S_pwayID) {
	pathwayProcessor.call(this, S_pwayID);
	Ldebug('pidProcessor called');

	this.A_bp3entry	= {};
	this.S_type		= 'PW';
	this.F_url		= function(id) {
		return 'http://www.humancyc.org/HUMAN/pathway-biopax?type=3&object='+id;
	};
	this.F_getTitle	= this.bp3getTitle;
	this.F_annotate	= this.bp3annotate;
	this.F_getNode	= this.bp3getNodes;
	this.F_getEdge = function(xml) {
		return this.A_bp3edge;
	};
	this.F_initEntry = this.bp3initEntries;
	
	return this.init(S_pwayID);
};	
biocycProcessor.prototype = new pathwayProcessor();
biocycProcessor.prototype.constructor = biocycProcessor;
