# Architecture rules
- Telemetry fuel reporting lives in a dedicated panel and query hook; refueling calculations must remain separate because they cannot establish onboard consumption.
- Fuel reporting groups observed CAN records by America/Sao_Paulo day and historical driver identity, and paginates database reads to avoid silently truncated periods.
- Do not enable measured consumption until the provider's actual fuel signal, units, ignition coverage and counter semantics are verified; tank level and odometer alone are insufficient.