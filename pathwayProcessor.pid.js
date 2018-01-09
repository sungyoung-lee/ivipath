pidProcessor = function(S_pwayID) {
	pathwayProcessor.call(this, S_pwayID);
	Ldebug('pidProcessor called');

	this.A_bp3entry		= {};
	this.S_type			= 'P0';
	this.F_url			= function(id) {
		return 'pathway.php?id='+id;
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
pidProcessor.prototype = new pathwayProcessor();
pidProcessor.prototype.constructor = pidProcessor;
