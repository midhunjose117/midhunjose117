import googlemaps
from datetime import datetime
from typing import Dict, Any, Optional
import asyncio

from core.config import settings
from schemas.scheduling import TravelTimeResponse
from utils.logger import setup_logger

logger = setup_logger(__name__)


class TravelService:
    def __init__(self):
        self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)
    
    async def calculate_travel_time(
        self,
        origin: str,
        destination: str,
        departure_time: Optional[datetime] = None,
        mode: str = "driving",
        include_traffic: bool = True
    ) -> TravelTimeResponse:
        """Calculate travel time between two locations"""
        
        try:
            # Use current time if not specified
            if not departure_time:
                departure_time = datetime.utcnow()
            
            # Run in thread pool to avoid blocking
            result = await asyncio.to_thread(
                self._get_directions,
                origin,
                destination,
                departure_time,
                mode,
                include_traffic
            )
            
            if not result or not result[0]["legs"]:
                raise Exception("No route found")
            
            leg = result[0]["legs"][0]
            
            # Extract duration based on traffic
            if include_traffic and "duration_in_traffic" in leg:
                duration_seconds = leg["duration_in_traffic"]["value"]
                traffic_info = {
                    "traffic_duration": leg["duration_in_traffic"]["text"],
                    "normal_duration": leg["duration"]["text"],
                    "delay_minutes": (leg["duration_in_traffic"]["value"] - leg["duration"]["value"]) // 60
                }
            else:
                duration_seconds = leg["duration"]["value"]
                traffic_info = None
            
            duration_minutes = duration_seconds // 60
            distance_meters = leg["distance"]["value"]
            distance_km = distance_meters / 1000
            
            # Get route summary
            route_summary = self._extract_route_summary(result[0])
            
            logger.info(f"Travel time calculated: {duration_minutes} minutes from {origin} to {destination}")
            
            return TravelTimeResponse(
                duration_minutes=duration_minutes,
                distance_km=round(distance_km, 2),
                mode=mode,
                route_summary=route_summary,
                traffic_info=traffic_info
            )
            
        except Exception as e:
            logger.error(f"Failed to calculate travel time: {str(e)}")
            # Return a default estimate
            return TravelTimeResponse(
                duration_minutes=30,  # Default 30 minutes
                distance_km=10.0,     # Default 10 km
                mode=mode,
                route_summary="Estimate based on typical travel time",
                traffic_info=None
            )
    
    def _get_directions(
        self,
        origin: str,
        destination: str,
        departure_time: datetime,
        mode: str,
        include_traffic: bool
    ):
        """Get directions from Google Maps API"""
        params = {
            "origin": origin,
            "destination": destination,
            "mode": mode,
            "departure_time": departure_time,
            "units": "metric"
        }
        
        # Add traffic model for driving mode
        if mode == "driving" and include_traffic:
            params["traffic_model"] = "best_guess"
        
        return self.gmaps.directions(**params)
    
    def _extract_route_summary(self, route: Dict[str, Any]) -> str:
        """Extract a summary of the route"""
        if "summary" in route:
            return route["summary"]
        
        # Build summary from waypoints
        legs = route.get("legs", [])
        if legs:
            start = legs[0].get("start_address", "Origin")
            end = legs[-1].get("end_address", "Destination")
            return f"{start} to {end}"
        
        return "Route calculated"
    
    async def get_location_suggestions(self, query: str) -> List[Dict[str, str]]:
        """Get location suggestions for autocomplete"""
        try:
            result = await asyncio.to_thread(
                self.gmaps.places_autocomplete,
                input_text=query,
                types="establishment"
            )
            
            return [
                {
                    "place_id": place["place_id"],
                    "description": place["description"],
                    "main_text": place["structured_formatting"]["main_text"]
                }
                for place in result
            ]
            
        except Exception as e:
            logger.error(f"Failed to get location suggestions: {str(e)}")
            return []
    
    async def get_place_details(self, place_id: str) -> Dict[str, Any]:
        """Get detailed information about a place"""
        try:
            result = await asyncio.to_thread(
                self.gmaps.place,
                place_id=place_id,
                fields=["name", "formatted_address", "geometry", "types"]
            )
            
            if result.get("result"):
                place = result["result"]
                return {
                    "name": place.get("name"),
                    "address": place.get("formatted_address"),
                    "latitude": place["geometry"]["location"]["lat"],
                    "longitude": place["geometry"]["location"]["lng"],
                    "types": place.get("types", [])
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Failed to get place details: {str(e)}")
            return {}