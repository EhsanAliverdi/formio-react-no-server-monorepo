import jetbrains.buildServer.configs.kotlin.Project
import jetbrains.buildServer.configs.kotlin.RelativeId
import jetbrains.buildServer.configs.kotlin.buildSteps.dotnetBuild
import jetbrains.buildServer.configs.kotlin.buildSteps.dotnetRestore
import jetbrains.buildServer.configs.kotlin.buildSteps.script
import jetbrains.buildServer.configs.kotlin.vcs.GitVcsRoot

version = "2024.12"

project {
    vcsRoot(SurveyFlowVcs)

    buildType(SurveyFlowBuild)
}

object SurveyFlowVcs : GitVcsRoot({
    id("SurveyFlowVcs")
    name = "HPA SurveyFlow"
    url = "%vcs.url%"
    branch = "refs/heads/%vcs.branch%"
})

object SurveyFlowBuild : jetbrains.buildServer.configs.kotlin.BuildType({
    id("SurveyFlowBuild")
    name = "Build and Validate"

    vcs {
        root(SurveyFlowVcs)
    }

    steps {
        dotnetRestore {
            projects = "HPA.SurveyFlow.slnx"
        }

        dotnetBuild {
            projects = "HPA.SurveyFlow.slnx"
            configuration = "Release"
            args = "--no-restore"
        }

        script {
            name = "Build Web"
            scriptContent = """
                cd HPA.SurveyFlow.Web
                npm ci
                npm run build
            """.trimIndent()
        }

        script {
            name = "Validate Docker Compose"
            scriptContent = """
                docker compose --env-file HPA.SurveyFlow.Docker/env/development.env -f HPA.SurveyFlow.Docker/compose/docker-compose.yml -f HPA.SurveyFlow.Docker/compose/docker-compose.development.yml config
                docker compose --env-file HPA.SurveyFlow.Docker/env/uat.env -f HPA.SurveyFlow.Docker/compose/docker-compose.yml -f HPA.SurveyFlow.Docker/compose/docker-compose.uat.yml config
                docker compose --env-file HPA.SurveyFlow.Docker/env/production.env -f HPA.SurveyFlow.Docker/compose/docker-compose.yml -f HPA.SurveyFlow.Docker/compose/docker-compose.production.yml config
            """.trimIndent()
        }
    }
})
