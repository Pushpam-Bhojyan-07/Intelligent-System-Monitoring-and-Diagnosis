
def fifo_page_replacement(pages, frame_count):
    """Replace the page that entered memory first."""
    frames = []
    queue = []
    trace = []
    faults = 0
    hits = 0

    for page in pages:
        if page in frames:
            hits += 1
            status = "Hit"
        else:
            faults += 1
            status = "Fault"

            if len(frames) < frame_count:
                frames.append(page)
                queue.append(page)
            else:
                removed = queue.pop(0)
                frames.remove(removed)
                frames.append(page)
                queue.append(page)

        trace.append({
            "page": page,
            "frames": frames.copy(),
            "status": status,
        })

    return build_result("FIFO", pages, frame_count, faults, hits, trace)


def lru_page_replacement(pages, frame_count):
    """Replace the least recently used page."""
    frames = []
    last_used = {}
    trace = []
    faults = 0
    hits = 0

    for index, page in enumerate(pages):
        if page in frames:
            hits += 1
            status = "Hit"
        else:
            faults += 1
            status = "Fault"

            if len(frames) < frame_count:
                frames.append(page)
            else:
                least_recent = min(
                    frames,
                    key=lambda p: last_used[p]
                )
                frames.remove(least_recent)
                frames.append(page)

        last_used[page] = index

        trace.append({
            "page": page,
            "frames": frames.copy(),
            "status": status,
        })

    return build_result("LRU", pages, frame_count, faults, hits, trace)


def optimal_page_replacement(pages, frame_count):
    """Replace the page whose next use is farthest in the future."""
    frames = []
    trace = []
    faults = 0
    hits = 0

    for index, page in enumerate(pages):
        if page in frames:
            hits += 1
            status = "Hit"
        else:
            faults += 1
            status = "Fault"

            if len(frames) < frame_count:
                frames.append(page)
            else:
                future_pages = pages[index + 1:]

                next_use = {}

                for frame_page in frames:
                    try:
                        next_use[frame_page] = future_pages.index(
                            frame_page
                        )
                    except ValueError:
                        next_use[frame_page] = float("inf")

                victim = max(frames, key=lambda p: next_use[p])
                frames.remove(victim)
                frames.append(page)

        trace.append({
            "page": page,
            "frames": frames.copy(),
            "status": status,
        })

    return build_result(
        "Optimal", pages, frame_count, faults, hits, trace
    )


def build_result(name, pages, frame_count, faults, hits, trace):
    total = len(pages)

    return {
        "algorithm": name,
        "reference_string": pages,
        "frame_count": frame_count,
        "total_references": total,
        "page_faults": faults,
        "page_hits": hits,
        "page_fault_rate": round(faults / total * 100, 2) if total else 0,
        "page_hit_rate": round(hits / total * 100, 2) if total else 0,
        "trace": trace,
    }


def compare_page_replacement(pages, frame_count):
    """Run all algorithms on identical input and compare results."""
    if frame_count <= 0:
        raise ValueError("Frame count must be greater than zero.")

    if not pages:
        raise ValueError("Page reference string cannot be empty.")

    results = {
        "FIFO": fifo_page_replacement(pages, frame_count),
        "LRU": lru_page_replacement(pages, frame_count),
        "Optimal": optimal_page_replacement(pages, frame_count),
    }

    return {
        "reference_string": pages,
        "frame_count": frame_count,
        "algorithms": results,
        "comparison": [
            {
                "algorithm": name,
                "page_faults": result["page_faults"],
                "page_hits": result["page_hits"],
                "page_fault_rate": result["page_fault_rate"],
            }
            for name, result in results.items()
        ],
    }
