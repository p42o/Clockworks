<?php
// Copy to _reviews-config.php on the host. Never commit credentials.
/*
Keep false until the real public website Terms of Use and Privacy Policy pages containing the Google Maps clauses (Google Maps End User Additional Terms of Service + Google Privacy Policy) are live, and Counsel and Parker have signed off. Only the Place ID may be stored; no review data is cached.
Only place_id is stored as Places content; api_key is a server credential.
Calls bill per request.
*/
return ['legal_pages_live' => false, 'api_key' => '', 'place_id' => '', 'max_reviews' => 5];
