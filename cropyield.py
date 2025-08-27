import pandas as pd
import math
from datetime import datetime, timedelta, timezone

# ---------- CONFIG ----------
TIME_STEP_MIN = 1  # minutes
OUTPUT_CSV = "solar_dataset_india.csv"
DEFAULT_SHADE_AZ_RANGES = [(100, 150), (200, 220)]  # example shading zones
# ----------------------------

def solar_position(lat, lon, dt_utc):
    """Calculate solar elevation and azimuth in degrees."""
    N = dt_utc.timetuple().tm_yday
    h = dt_utc.hour + dt_utc.minute/60 + dt_utc.second/3600
    gamma = 2*math.pi/365 * (N - 1 + (h-12)/24)

    # Equation of time
    eqtime = 229.18*(0.000075 + 0.001868*math.cos(gamma) - 0.032077*math.sin(gamma)
                      -0.014615*math.cos(2*gamma) -0.040849*math.sin(2*gamma))

    # Solar declination
    decl = (0.006918 -0.399912*math.cos(gamma) +0.070257*math.sin(gamma)
            -0.006758*math.cos(2*gamma)+0.000907*math.sin(2*gamma)
            -0.002697*math.cos(3*gamma)+0.00148*math.sin(3*gamma))

    # Hour angle
    tst = h*60 + eqtime + 4*lon
    H = math.radians(tst/4 - 180)

    lat_r = math.radians(lat)
    elev_rad = math.asin(math.sin(lat_r)*math.sin(decl) + math.cos(lat_r)*math.cos(decl)*math.cos(H))
    elev_deg = math.degrees(elev_rad)

    denom = math.cos(elev_rad)*math.cos(lat_r)
    cos_az = (math.sin(decl) - math.sin(elev_rad)*math.sin(lat_r))/denom
    cos_az = max(-1, min(1, cos_az))
    az_deg = math.degrees(math.acos(cos_az))
    if H > 0:
        az_deg = 360 - az_deg

    return round(elev_deg,2), round(az_deg,2)

def shade_factor(elev, az, shade_zones=DEFAULT_SHADE_AZ_RANGES):
    """Return shade factor (0-1) based on elevation and azimuth."""
    if elev <= 0:
        return 0.0
    for start, end in shade_zones:
        if start <= end:
            if start <= az <= end:
                return 0.2
        else:  # wraparound e.g., 350°–10°
            if az >= start or az <= end:
                return 0.2
    return 1.0

def generate_solar_dataset(lat, lon, year, month, day, start_hour=0, end_hour=23, shade_zones=None, time_step=TIME_STEP_MIN):
    if shade_zones is None:
        shade_zones = DEFAULT_SHADE_AZ_RANGES
    rows = []

    current_time = datetime(year, month, day, start_hour, 0, tzinfo=timezone.utc)
    end_time = datetime(year, month, day, end_hour, 59, tzinfo=timezone.utc)

    while current_time <= end_time:
        elev, az = solar_position(lat, lon, current_time)
        shade = shade_factor(elev, az, shade_zones)
        day_of_year = current_time.timetuple().tm_yday
        rows.append({
            "datetime_utc": current_time.isoformat(),
            "hour_utc": current_time.hour,
            "minute": current_time.minute,
            "lat": lat,
            "lon": lon,
            "day_of_year": day_of_year,
            "solar_elevation_deg": elev,
            "solar_azimuth_deg": az,
            "shade_factor": shade,
            "datetime_ist": (current_time + timedelta(hours=5, minutes=30)).isoformat()  # IST
        })
        current_time += timedelta(minutes=time_step)

    df = pd.DataFrame(rows)
    return df

# ---------- USER INPUT ----------
lat = float(input("Enter latitude (e.g., 29.37 for Bhimtal): "))
lon = float(input("Enter longitude (e.g., 79.53 for Bhimtal): "))
year = int(input("Enter year (e.g., 2025): "))
month = int(input("Enter month (1-12): "))
day = int(input("Enter day (1-31): "))
start_hour = int(input("Enter start hour (0-23, UTC): "))
end_hour = int(input("Enter end hour (0-23, UTC): "))

df_solar = generate_solar_dataset(lat, lon, year, month, day, start_hour, end_hour)
df_solar.to_csv(OUTPUT_CSV, index=False)
print(f"Solar dataset with shade for {lat},{lon} on {year}-{month:02d}-{day:02d} saved as {OUTPUT_CSV}")
print(df_solar.head(20))
