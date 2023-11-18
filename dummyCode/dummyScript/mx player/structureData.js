exports.structureDataMxSeason = async (data) => {
  try {
    const correct = {
      description: data.basicDetails.description,
      title: data.basicDetails.title,
      releaseDate: data.basicDetails.releaseDate,
      type: data.basicDetails.type,
      age: data.basicDetails.rating,
      contentId: data.basicDetails.id,
      languages: data.basicDetails.languages,
      categories: data.basicDetails.genres,
      imageInfo: data.basicDetails.imageInfo,
      trailer: data.basicDetails.trailer,
      totalSeasons: data.basicDetails.childCount,
      videosCount: data.basicDetails.videoCount,
      seasons: [],
    }
    for (let i = 0; i < data.basicDetails.childCount; i++) {
      const season = {
        title: data.itemDetailed.tabs[0].containers[i].title,
        episodeCount: data.itemDetailed.tabs[0].containers[i].episodesCount,
        id: data.itemDetailed.tabs[0].containers[i].id,
        episodes: data.seasons[i].s,
      }
      season.episodes = season.episodes.map((s) => {
        return {
          description: s.description,
          title: s.title,
          type: s.type,
          stream: s.stream,
          releaseDate: s.releaseDate,
          id: s.id,
          languages: s.languages,
          duration: s.duration,
          imageInfo: s.imageInfo,
        }
      })
      correct.seasons.push(season)
    }

    return correct
  } catch (error) {
    console.log(error)
  }
}

exports.structureDataMxMovies = (data) => {
  try {
    const correct = {
      description: data.description,
      title: data.title,
      releaseDate: data.releaseDate,
      type: data.type,
      age: data.rating,
      contentId: data.id,
      languages: data.languages,
      categories: data.genres,
      imageInfo: data.imageInfo,
      trailer: data.trailer,
      isMovie: true,
      totalSeasons: data.childCount,
      videosCount: data.videoCount,
      stream: data.stream,
    }

    return correct
  } catch (error) {
    console.log(error)
  }
}
