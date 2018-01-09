pharmgkbProcessor = function(S_pwayID) {
	pathwayProcessor.call(this, S_pwayID);
	Ldebug('pharmgkbProcessor called');

	this.A_bp3entry		= {};
	this.S_type			= 'PW';
	this.F_url			= function(id) {
		return 'https://api.pharmgkb.org/v1/download/pathway/'+id+'?format=.owl';
	};
	this.F_preprocess	= this.bp3preprocess;
	this.F_init			= this.bp3initialize;
	this.F_getTitle		= this.bp3getTitle;
	this.F_annotate		= this.bp3annotate;
	this.F_getNode		= this.bp3getNodes;
	this.F_getEdge		= this.bp3getEdges;
	this.F_initEntry	= this.bp3initEntries;
	
	return this.init(S_pwayID);
};	
pharmgkbProcessor.prototype = new pathwayProcessor();
pharmgkbProcessor.prototype.constructor = pharmgkbProcessor;
